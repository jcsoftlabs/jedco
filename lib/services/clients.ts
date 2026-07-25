import { prisma } from "@/lib/db";
import { codeClient } from "@/lib/codes";
import type { Prisma } from "@/app/generated/prisma/client";
import type { StatutFacture } from "@/app/generated/prisma/enums";
import type { CreerClientInput, ListeClientsParams, ModifierClientInput } from "@/lib/schemas/clients";

export async function listerClients(params: ListeClientsParams) {
  const { page, limit, ville, type, actif, search } = params;

  const where: Prisma.ClientWhereInput = {
    deletedAt: null,
    ...(ville ? { ville } : {}),
    ...(type ? { type } : {}),
    ...(actif !== undefined ? { actif } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search, mode: "insensitive" } },
            { code: { contains: search, mode: "insensitive" } },
            { telephone: { contains: search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirClient(id: string) {
  return prisma.client.findFirst({ where: { id, deletedAt: null } });
}

export async function statsClient(id: string) {
  const client = await obtenirClient(id);
  if (!client) return null;

  const [totalInterventions, factures] = await Promise.all([
    prisma.intervention.count({ where: { clientId: id, deletedAt: null } }),
    prisma.facture.findMany({
      where: { clientId: id, deletedAt: null },
      select: { totalHTG: true, statut: true },
    }),
  ]);

  const statutsImpayes: StatutFacture[] = ["EN_ATTENTE", "PARTIELLEMENT_PAYEE", "EN_RETARD"];
  const montantDuHTG = factures
    .filter((f) => statutsImpayes.includes(f.statut))
    .reduce((total, f) => total + f.totalHTG, 0n);

  return {
    totalInterventions,
    totalFactures: factures.length,
    montantDuHTG,
  };
}

export async function creerClient(input: CreerClientInput) {
  const code = await codeClient();
  return prisma.client.create({ data: { ...input, code } });
}

export async function modifierClient(id: string, input: ModifierClientInput) {
  const client = await obtenirClient(id);
  if (!client) return null;
  return prisma.client.update({ where: { id }, data: input });
}

// Soft delete (§1.12) — jamais de suppression physique : un client supprimé
// peut encore être référencé par des factures ou interventions historiques.
export async function supprimerClient(id: string) {
  const client = await obtenirClient(id);
  if (!client) return null;
  return prisma.client.update({ where: { id }, data: { deletedAt: new Date(), actif: false } });
}
