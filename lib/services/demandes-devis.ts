import { prisma } from "@/lib/db";
import { creerClient } from "@/lib/services/clients";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerDemandeDevisInput, ListeDemandesDevisParams } from "@/lib/schemas/demandes-devis";

export async function creerDemandeDevis(input: CreerDemandeDevisInput) {
  // Route publique non authentifiée : la validation du type est la seule
  // barrière restante depuis la disparition de l’énumération.
  await verifierTypesService([input.service]);
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

// Transforme un prospect en Client pour pouvoir lui établir un vrai devis
// (lignes, taxe, référence DEV-YYYY-XXXX) — une demande de devis n'a ni prix
// ni lignes, ce n'est qu'une prise de contact. Cherche d'abord par téléphone
// pour éviter de dupliquer un client déjà existant si la même personne
// soumet le formulaire plusieurs fois ou est déjà cliente.
export async function convertirDemandeEnClient(id: string) {
  const demande = await prisma.demandeDevis.findUnique({ where: { id } });
  if (!demande) return null;

  const existant = await prisma.client.findFirst({
    where: { telephone: demande.telephone, deletedAt: null },
  });

  const client =
    existant ??
    (await creerClient({
      nom: demande.nom,
      type: "PARTICULIER",
      telephone: demande.telephone,
      email: demande.email ?? undefined,
      ville: demande.ville,
    }));

  await prisma.demandeDevis.update({ where: { id }, data: { traite: true } });

  return { client, demande };
}
