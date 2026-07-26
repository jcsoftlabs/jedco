import { prisma } from "@/lib/db";
import { referenceFacture } from "@/lib/codes";
import { htgToCentimes, encoderTaux } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import { motifsRecherche } from "@/lib/services/recherche";
import type { Prisma } from "@/app/generated/prisma/client";
import type { StatutFacture } from "@/app/generated/prisma/enums";
import type { CreerFactureInput, ListeFacturesParams, ModifierFactureInput } from "@/lib/schemas/factures";

const INCLUDE_STANDARD = {
  client: true,
  lignes: { orderBy: { ordre: "asc" } },
  paiements: true,
} satisfies Prisma.FactureInclude;

export async function listerFactures(params: ListeFacturesParams) {
  const { page, limit, clientId, statut, dateDebut, dateFin, search } = params;

  // Voir listerClients pour le détail de l'approche (jointure Client pour
  // chercher aussi par nom, unaccent pour l'insensibilité aux accents).
  let idsRecherche: string[] | undefined;
  if (search?.trim()) {
    const motifs = motifsRecherche(search);
    const lignes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT f.id FROM "Facture" f
      JOIN "Client" c ON c.id = f."clientId"
      WHERE f."deletedAt" IS NULL AND unaccent(lower(
        coalesce(f.reference, '') || ' ' || coalesce(c.nom, '') || ' ' || coalesce(c.email, '')
      )) LIKE ALL(${motifs}::text[])
    `;
    idsRecherche = lignes.map((l) => l.id);
  }

  const where: Prisma.FactureWhereInput = {
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(statut ? { statut } : {}),
    ...(idsRecherche ? { id: { in: idsRecherche } } : {}),
    ...(dateDebut || dateFin
      ? {
          dateEmission: {
            ...(dateDebut ? { gte: dateDebut } : {}),
            ...(dateFin ? { lte: dateFin } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.facture.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateEmission: "desc" },
      include: INCLUDE_STANDARD,
    }),
    prisma.facture.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirFacture(id: string) {
  return prisma.facture.findFirst({
    where: { id, deletedAt: null },
    include: { ...INCLUDE_STANDARD, intervention: true, contrat: true },
  });
}

export async function tauxUsdCourantEncode(): Promise<number | null> {
  const config = await prisma.config.findUnique({ where: { cle: "TAUX_USD_HTG" } });
  if (!config) return null;
  const valeur = Number(config.valeur);
  if (!Number.isFinite(valeur) || valeur <= 0) return null;
  return encoderTaux(valeur);
}

export async function creerFacture(input: CreerFactureInput) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new ErreurMetier("Client introuvable", 400);

  if (input.interventionId) {
    const intervention = await prisma.intervention.findFirst({
      where: { id: input.interventionId, deletedAt: null },
    });
    if (!intervention) throw new ErreurMetier("Intervention introuvable", 400);

    const factureExistante = await prisma.facture.findUnique({
      where: { interventionId: input.interventionId },
    });
    if (factureExistante) throw new ErreurMetier("Cette intervention a déjà une facture", 409);
  }

  if (input.contratId) {
    const contrat = await prisma.contrat.findFirst({
      where: { id: input.contratId, deletedAt: null, clientId: input.clientId },
    });
    if (!contrat) throw new ErreurMetier("Contrat introuvable pour ce client", 400);
  }

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
  // Taux converti en "centièmes de pourcent" pour rester en arithmétique
  // entière (BigInt) — jamais de flottant sur un calcul de montant (§1.7).
  const tauxTaxeCentiemes = BigInt(Math.round(input.tauxTaxePourcent * 100));
  const taxeHTG = (montantHTG * tauxTaxeCentiemes) / 10_000n;
  const totalHTG = montantHTG + taxeHTG;

  const reference = await referenceFacture();
  const dateEcheance = new Date(Date.now() + input.dateEcheanceJours * 86_400_000);
  const tauxUsdApplique = await tauxUsdCourantEncode();

  return prisma.facture.create({
    data: {
      reference,
      clientId: input.clientId,
      interventionId: input.interventionId,
      contratId: input.contratId,
      montantHTG,
      taxeHTG,
      totalHTG,
      tauxUsdApplique,
      dateEcheance,
      notes: input.notes,
      lignes: { create: lignes },
    },
    include: INCLUDE_STANDARD,
  });
}

export async function modifierFacture(id: string, input: ModifierFactureInput) {
  const facture = await prisma.facture.findFirst({
    where: { id, deletedAt: null },
    include: { paiements: true },
  });
  if (!facture) return null;

  if (facture.paiements.length > 0) {
    throw new ErreurMetier("Impossible de modifier une facture qui a déjà des paiements enregistrés", 400);
  }

  const { lignes, tauxTaxePourcent, ...reste } = input;
  if (!lignes || tauxTaxePourcent === undefined) {
    return prisma.facture.update({ where: { id }, data: reste, include: INCLUDE_STANDARD });
  }

  // Même calcul que creerFacture — un montant facturé ne se recalcule jamais
  // qu'à partir des lignes, jamais en ajustant totalHTG directement.
  const nouvellesLignes = lignes.map((ligne, ordre) => {
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
  const montantHTG = nouvellesLignes.reduce((total, l) => total + l.totalHTG, 0n);
  const tauxTaxeCentiemes = BigInt(Math.round(tauxTaxePourcent * 100));
  const taxeHTG = (montantHTG * tauxTaxeCentiemes) / 10_000n;
  const totalHTG = montantHTG + taxeHTG;

  return prisma.facture.update({
    where: { id },
    data: {
      ...reste,
      montantHTG,
      taxeHTG,
      totalHTG,
      // Remplacement complet plutôt qu'un diff ligne à ligne : le formulaire
      // renvoie toujours l'état final voulu, pas une liste de changements.
      lignes: { deleteMany: {}, create: nouvellesLignes },
    },
    include: INCLUDE_STANDARD,
  });
}

// Soft delete (§1.12) — refusé si des paiements existent : annuler une
// facture déjà réglée, même partiellement, fausserait la comptabilité sans
// laisser de trace claire du pourquoi.
export async function supprimerFacture(id: string) {
  const facture = await prisma.facture.findFirst({
    where: { id, deletedAt: null },
    include: { paiements: true },
  });
  if (!facture) return null;

  if (facture.paiements.length > 0) {
    throw new ErreurMetier("Impossible de supprimer une facture qui a des paiements enregistrés", 400);
  }

  return prisma.facture.update({ where: { id }, data: { deletedAt: new Date(), statut: "ANNULEE" } });
}

// Idempotente par construction, même principe que marquerContratsExpires
// (§1.9) : ne touche que les factures impayées dont l'échéance est dépassée.
//
// Limite assumée du modèle de données hérité du master prompt v1 : StatutFacture
// n'a qu'une valeur EN_RETARD, distincte de PARTIELLEMENT_PAYEE — une facture
// partiellement payée ET en retard devient "EN_RETARD" et perd l'affichage
// "partiellement payée". Le montant réellement dû se calcule toujours depuis
// totalHTG - somme(paiements), jamais depuis le seul statut.
export async function marquerFacturesEnRetard(maintenant: Date = new Date()): Promise<number> {
  const resultat = await prisma.facture.updateMany({
    where: {
      statut: { in: ["EN_ATTENTE", "PARTIELLEMENT_PAYEE"] },
      deletedAt: null,
      dateEcheance: { lt: maintenant },
    },
    data: { statut: "EN_RETARD" },
  });
  return resultat.count;
}

export async function statsFactures(params: { dateDebut?: Date; dateFin?: Date }) {
  const where: Prisma.FactureWhereInput = {
    deletedAt: null,
    ...(params.dateDebut || params.dateFin
      ? {
          dateEmission: {
            ...(params.dateDebut ? { gte: params.dateDebut } : {}),
            ...(params.dateFin ? { lte: params.dateFin } : {}),
          },
        }
      : {}),
  };

  const factures = await prisma.facture.findMany({
    where,
    include: { lignes: true, client: true, paiements: true },
  });

  const revenusParService = new Map<string, bigint>();
  const revenusParVille = new Map<string, bigint>();
  let totalFactureHTG = 0n;
  let totalPayeHTG = 0n;

  for (const facture of factures) {
    totalFactureHTG += facture.totalHTG;
    totalPayeHTG += facture.paiements.reduce((s, p) => s + p.montantHTG, 0n);

    for (const ligne of facture.lignes) {
      const cle = ligne.service ?? "AUTRE";
      revenusParService.set(cle, (revenusParService.get(cle) ?? 0n) + ligne.totalHTG);
    }
    // facture.client ne peut manquer que sous une vraie course (client
    // supprimé physiquement entre la lecture et l'itération — n'arrive pas
    // en usage normal, le client est toujours soft-deleted, mais a été
    // observé sous suppression concurrente en environnement de test) : on
    // garde le facture.totalHTG dans le total global déjà comptabilisé
    // au-dessus, seule la ventilation par ville de CETTE facture est omise.
    if (facture.client) {
      revenusParVille.set(
        facture.client.ville,
        (revenusParVille.get(facture.client.ville) ?? 0n) + facture.totalHTG
      );
    }
  }

  return {
    totalFactureHTG,
    totalPayeHTG,
    totalImpayeHTG: totalFactureHTG - totalPayeHTG,
    nombreFactures: factures.length,
    revenusParService: Object.fromEntries(revenusParService),
    revenusParVille: Object.fromEntries(revenusParVille),
  };
}
