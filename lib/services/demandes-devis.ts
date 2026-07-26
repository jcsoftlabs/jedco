import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerDemandeDevisInput, ListeDemandesDevisParams } from "@/lib/schemas/demandes-devis";

export async function creerDemandeDevis(input: CreerDemandeDevisInput) {
  return prisma.demandeDevis.create({ data: input });
}

export async function listerDemandesDevis(params: ListeDemandesDevisParams) {
  const { page, limit, traite } = params;
  const where: Prisma.DemandeDevisWhereInput = traite !== undefined ? { traite } : {};

  const [data, total] = await Promise.all([
    prisma.demandeDevis.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.demandeDevis.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function marquerDemandeDevisTraitee(id: string, traite: boolean) {
  const demande = await prisma.demandeDevis.findUnique({ where: { id } });
  if (!demande) return null;

  return prisma.demandeDevis.update({ where: { id }, data: { traite } });
}
