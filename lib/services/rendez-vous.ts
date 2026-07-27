import { prisma } from "@/lib/db";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerRendezVousInput, ListeRendezVousParams } from "@/lib/schemas/rendez-vous";

// Le modèle RendezVous existait dans le schéma depuis la Phase 0 (formulaire
// public prévu au plan initial) mais n'était référencé nulle part — ni
// formulaire, ni page admin. Ce service est le premier code qui l'utilise.

export async function creerRendezVous(input: CreerRendezVousInput) {
  await verifierTypesService([input.service]);
  return prisma.rendezVous.create({ data: input });
}

export async function listerRendezVous(params: ListeRendezVousParams) {
  const { page, limit, statut } = params;
  const where: Prisma.RendezVousWhereInput = statut ? { statut } : {};

  const [data, total] = await Promise.all([
    prisma.rendezVous.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      // Le prochain rendez-vous à honorer d'abord, pas le plus récemment
      // soumis — contrairement à DemandeDevis, l'ordre utile ici est celui
      // du calendrier, pas celui de la boîte de réception.
      orderBy: { dateVoulue: "asc" },
    }),
    prisma.rendezVous.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function changerStatutRendezVous(id: string, statut: string) {
  const rdv = await prisma.rendezVous.findUnique({ where: { id } });
  if (!rdv) return null;

  return prisma.rendezVous.update({ where: { id }, data: { statut } });
}
