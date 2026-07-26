import { prisma } from "@/lib/db";
import { referenceContrat } from "@/lib/codes";
import { htgToCentimes } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { TypeContrat } from "@/app/generated/prisma/enums";
import type { CreerContratInput, ListeContratsParams, ModifierContratInput } from "@/lib/schemas/contrats";

export async function listerContrats(params: ListeContratsParams) {
  const { page, limit, clientId, statut, type, expirantDansJours } = params;

  const where: Prisma.ContratWhereInput = {
    deletedAt: null,
    ...(clientId ? { clientId } : {}),
    ...(statut ? { statut } : {}),
    ...(type ? { type } : {}),
    ...(expirantDansJours !== undefined
      ? {
          statut: statut ?? "ACTIF",
          dateFin: { lte: new Date(Date.now() + expirantDansJours * 86_400_000) },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contrat.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dateFin: "asc" },
      include: { client: true },
    }),
    prisma.contrat.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirContrat(id: string) {
  return prisma.contrat.findFirst({ where: { id, deletedAt: null }, include: { client: true } });
}

export async function creerContrat(input: CreerContratInput) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new ErreurMetier("Client introuvable", 400);

  await verifierTypesService(input.services);

  const reference = await referenceContrat();
  return prisma.contrat.create({
    data: {
      reference,
      clientId: input.clientId,
      type: input.type,
      services: input.services,
      montantHTG: htgToCentimes(input.montantHTG),
      dateDebut: input.dateDebut,
      dateFin: input.dateFin,
      renouvellementAuto: input.renouvellementAuto,
    },
  });
}

export async function modifierContrat(id: string, input: ModifierContratInput) {
  const contrat = await obtenirContrat(id);
  if (!contrat) return null;

  const { montantHTG, ...reste } = input;
  return prisma.contrat.update({
    where: { id },
    data: {
      ...reste,
      ...(montantHTG !== undefined ? { montantHTG: htgToCentimes(montantHTG) } : {}),
    },
  });
}

export async function supprimerContrat(id: string) {
  const contrat = await obtenirContrat(id);
  if (!contrat) return null;
  return prisma.contrat.update({ where: { id }, data: { deletedAt: new Date(), statut: "RESILIE" } });
}

const DUREE_RENOUVELLEMENT_MOIS: Partial<Record<TypeContrat, number>> = {
  MENSUEL: 1,
  TRIMESTRIEL: 3,
  ANNUEL: 12,
};

export async function renouvelerContrat(id: string) {
  const contrat = await obtenirContrat(id);
  if (!contrat) return null;

  const mois = DUREE_RENOUVELLEMENT_MOIS[contrat.type];
  if (!mois) {
    throw new ErreurMetier("Un contrat ponctuel n'est pas renouvelable", 400);
  }

  // Arithmétique de date en UTC exclusivement : Date.prototype.setMonth()
  // opère en fuseau LOCAL du serveur, pas UTC. Sur une dateFin ancrée en UTC
  // minuit, un serveur dont le fuseau local n'est pas UTC (America/New_York,
  // Europe/Paris…) lit un jour calendaire différent avant même l'ajout des
  // mois, ce qui décale le résultat de plusieurs jours — même classe de bug
  // que la borne de journée du §1.14, vérifiée empiriquement ici aussi.
  const dateFin = contrat.dateFin;
  const nouvelleDateFin = new Date(
    Date.UTC(dateFin.getUTCFullYear(), dateFin.getUTCMonth() + mois, dateFin.getUTCDate())
  );

  return prisma.contrat.update({
    where: { id },
    data: { dateFin: nouvelleDateFin, statut: "ACTIF" },
  });
}

// Idempotente par construction : ne touche que les contrats ACTIF dont la
// date de fin est dépassée, donc rejouable sans effet de bord même en cas de
// double déclenchement du cron (§1.9) — pas besoin de verrou consultatif ici,
// contrairement à la génération de factures récurrentes qui, elle, crée des
// lignes et doit être protégée explicitement (Phase 2).
export async function marquerContratsExpires(maintenant: Date = new Date()): Promise<number> {
  const resultat = await prisma.contrat.updateMany({
    where: { statut: "ACTIF", deletedAt: null, dateFin: { lt: maintenant } },
    data: { statut: "EXPIRE" },
  });
  return resultat.count;
}
