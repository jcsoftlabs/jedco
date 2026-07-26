import { prisma } from "@/lib/db";
import { referenceDevis, referenceFacture } from "@/lib/codes";
import { htgToCentimes } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import { tauxUsdCourantEncode } from "@/lib/services/factures";
import { motifsRecherche } from "@/lib/services/recherche";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerDevisInput, ListeDevisParams, ModifierDevisInput } from "@/lib/schemas/devis";

const INCLUDE_STANDARD = {
  client: true,
  lignes: { orderBy: { ordre: "asc" } },
} satisfies Prisma.DevisInclude;

export async function listerDevis(params: ListeDevisParams) {
  const { page, limit, clientId, statut, search } = params;

  // Voir listerClients pour le détail de l'approche.
  let idsRecherche: string[] | undefined;
  if (search?.trim()) {
    const motifs = motifsRecherche(search);
    const lignes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT d.id FROM "Devis" d
      JOIN "Client" c ON c.id = d."clientId"
      WHERE d."deletedAt" IS NULL AND unaccent(lower(
        coalesce(d.reference, '') || ' ' || coalesce(c.nom, '') || ' ' || coalesce(c.email, '')
      )) LIKE ALL(${motifs}::text[])
    `;
    idsRecherche = lignes.map((l) => l.id);
  }

  const where: Prisma.DevisWhereInput = {
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(statut ? { statut } : {}),
    ...(idsRecherche ? { id: { in: idsRecherche } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.devis.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateEmission: "desc" },
      include: INCLUDE_STANDARD,
    }),
    prisma.devis.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirDevis(id: string) {
  return prisma.devis.findFirst({
    where: { id, deletedAt: null },
    include: INCLUDE_STANDARD,
  });
}

export async function creerDevis(input: CreerDevisInput) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new ErreurMetier("Client introuvable", 400);

  const lignes = input.lignes.map((ligne, ordre) => {
    const prixUnitaireHTG = htgToCentimes(ligne.prixUnitaireHTG);
    return {
      description: ligne.description,
      service: ligne.service,
      quantite: ligne.quantite,
      prixUnitaireHTG,
      totalHTG: prixUnitaireHTG * BigInt(ligne.quantite),
      ordre,
    };
  });

  const montantHTG = lignes.reduce((total, l) => total + l.totalHTG, 0n);
  const tauxTaxeCentiemes = BigInt(Math.round(input.tauxTaxePourcent * 100));
  const taxeHTG = (montantHTG * tauxTaxeCentiemes) / 10_000n;
  const totalHTG = montantHTG + taxeHTG;

  const reference = await referenceDevis();
  const dateValidite = new Date(Date.now() + input.dateValiditeJours * 86_400_000);
  const tauxUsdApplique = await tauxUsdCourantEncode();

  return prisma.devis.create({
    data: {
      reference,
      clientId: input.clientId,
      montantHTG,
      taxeHTG,
      totalHTG,
      tauxUsdApplique,
      dateValidite,
      notes: input.notes,
      lignes: { create: lignes },
    },
    include: INCLUDE_STANDARD,
  });
}

export async function modifierDevis(id: string, input: ModifierDevisInput) {
  const devis = await prisma.devis.findFirst({ where: { id, deletedAt: null } });
  if (!devis) return null;

  if (devis.statut === "CONVERTI") {
    throw new ErreurMetier("Un devis déjà converti en facture ne peut plus être modifié", 400);
  }

  return prisma.devis.update({ where: { id }, data: input, include: INCLUDE_STANDARD });
}

export async function supprimerDevis(id: string) {
  const devis = await prisma.devis.findFirst({ where: { id, deletedAt: null } });
  if (!devis) return null;

  if (devis.statut === "CONVERTI") {
    throw new ErreurMetier("Un devis déjà converti en facture ne peut pas être supprimé", 400);
  }

  return prisma.devis.update({ where: { id }, data: { deletedAt: new Date() } });
}

// Transforme un devis accepté en facture réelle (référence FAC-YYYY-XXXX,
// propre séquence comptable) au lieu de réutiliser le devis comme document
// fiscal — un devis n'a ni les mêmes obligations comptables ni la même
// séquence qu'une facture émise. Toute la transformation est atomique : soit
// la facture et ses lignes existent et le devis pointe dessus, soit rien.
export async function convertirDevisEnFacture(id: string, dateEcheanceJours = 30) {
  return prisma.$transaction(async (tx) => {
    const devis = await tx.devis.findFirst({
      where: { id, deletedAt: null },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    });
    if (!devis) return null;

    if (devis.statut === "CONVERTI" || devis.factureId) {
      throw new ErreurMetier("Ce devis a déjà été converti en facture", 409);
    }
    if (devis.statut === "REFUSE" || devis.statut === "EXPIRE") {
      throw new ErreurMetier("Un devis refusé ou expiré ne peut pas être converti en facture", 400);
    }

    const reference = await referenceFacture();
    const dateEcheance = new Date(Date.now() + dateEcheanceJours * 86_400_000);

    const facture = await tx.facture.create({
      data: {
        reference,
        clientId: devis.clientId,
        montantHTG: devis.montantHTG,
        taxeHTG: devis.taxeHTG,
        totalHTG: devis.totalHTG,
        tauxUsdApplique: devis.tauxUsdApplique,
        dateEcheance,
        notes: devis.notes,
        lignes: {
          create: devis.lignes.map((l) => ({
            description: l.description,
            service: l.service,
            quantite: l.quantite,
            prixUnitaireHTG: l.prixUnitaireHTG,
            totalHTG: l.totalHTG,
            ordre: l.ordre,
          })),
        },
      },
      include: { client: true, lignes: { orderBy: { ordre: "asc" } }, paiements: true },
    });

    await tx.devis.update({
      where: { id },
      data: { statut: "CONVERTI", factureId: facture.id },
    });

    return facture;
  });
}
