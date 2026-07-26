import { prisma } from "@/lib/db";
import { referenceIntervention } from "@/lib/codes";
import { ErreurMetier } from "@/lib/errors";
import { transitionValide } from "@/lib/interventions/statut";
import { debutJourLocal, finJourLocal } from "@/lib/dates";
import { scopeInterventions } from "@/lib/auth/rbac";
import { STATUTS_VEHICULE_INDISPONIBLE } from "@/lib/services/vehicules";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { Role, StatutIntervention } from "@/app/generated/prisma/enums";
import type {
  CreerInterventionInput,
  ListeInterventionsParams,
  ModifierInterventionInput,
  RapportExecutionInput,
} from "@/lib/schemas/interventions";

export type UtilisateurScope = { id: string; role: Role; technicien?: { id: string } | null };

const INCLUDE_STANDARD = {
  client: true,
  vehicule: true,
  techniciens: { include: { technicien: { include: { user: true } } } },
} satisfies Prisma.InterventionInclude;

export async function listerInterventions(params: ListeInterventionsParams, user: UtilisateurScope) {
  const { page, limit, statut, type, ville, technicienId, date } = params;

  const where: Prisma.InterventionWhereInput = {
    deletedAt: null,
    ...scopeInterventions(user),
    ...(statut ? { statut } : {}),
    ...(type ? { type } : {}),
    ...(ville ? { ville } : {}),
    ...(technicienId ? { techniciens: { some: { technicienId } } } : {}),
    ...(date ? { datePlanifiee: { gte: debutJourLocal(date), lte: finJourLocal(date) } } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.intervention.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { datePlanifiee: "asc" },
      include: INCLUDE_STANDARD,
    }),
    prisma.intervention.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirIntervention(id: string, user: UtilisateurScope) {
  return prisma.intervention.findFirst({
    where: { id, deletedAt: null, ...scopeInterventions(user) },
    include: { ...INCLUDE_STANDARD, contrat: true, photos: true, facture: true },
  });
}

export async function creerIntervention(input: CreerInterventionInput) {
  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new ErreurMetier("Client introuvable", 400);

  // Remplace la garantie que donnait l’énumération PostgreSQL (voir la
  // migration types_reference) : la colonne est désormais du texte libre.
  await verifierTypesService([input.type]);

  if (input.contratId) {
    const contrat = await prisma.contrat.findFirst({
      where: { id: input.contratId, deletedAt: null, clientId: input.clientId },
    });
    if (!contrat) throw new ErreurMetier("Contrat introuvable pour ce client", 400);
  }

  // La contrainte d'exclusion (§1.3) empêche de réserver deux fois le même
  // véhicule sur un créneau qui se chevauche, mais elle ignore complètement
  // son statut : sans ce contrôle, on pouvait planifier une intervention sur
  // un camion à l'atelier ou hors service.
  if (input.vehiculeId) {
    const vehicule = await prisma.vehicule.findFirst({
      where: { id: input.vehiculeId, deletedAt: null },
    });
    if (!vehicule) throw new ErreurMetier("Véhicule introuvable", 400);
    if (STATUTS_VEHICULE_INDISPONIBLE.includes(vehicule.statut)) {
      throw new ErreurMetier(
        `Le véhicule ${vehicule.immatriculation} est ${vehicule.statut === "EN_MAINTENANCE" ? "en maintenance" : "hors service"} et ne peut pas être affecté`,
        409
      );
    }
  }

  const reference = await referenceIntervention();
  const { technicienIds, ...donnees } = input;

  // Les contraintes d'exclusion (§1.3) protègent cet INSERT — un chevauchement
  // sur le véhicule ou l'un des techniciens fait échouer toute la transaction
  // avec une erreur Postgres 23P01, traduite en 409 par lib/api/error-handler.ts.
  return prisma.intervention.create({
    data: {
      reference,
      ...donnees,
      techniciens: technicienIds.length
        ? { create: technicienIds.map((technicienId) => ({ technicienId })) }
        : undefined,
    },
    include: INCLUDE_STANDARD,
  });
}

export async function modifierIntervention(
  id: string,
  input: ModifierInterventionInput,
  user: UtilisateurScope
) {
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) return null;

  return prisma.intervention.update({ where: { id }, data: input, include: INCLUDE_STANDARD });
}

export async function changerStatutIntervention(
  id: string,
  nouveauStatut: StatutIntervention,
  user: UtilisateurScope
) {
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) return null;

  if (!transitionValide(intervention.statut, nouveauStatut)) {
    throw new ErreurMetier(`Transition invalide : ${intervention.statut} → ${nouveauStatut}`, 400);
  }

  const misAJour = await prisma.intervention.update({
    where: { id },
    data: { statut: nouveauStatut },
    include: INCLUDE_STANDARD,
  });

  // Comportement demandé par le master prompt 2.1 : signaler qu'une facture
  // peut être proposée. La génération elle-même arrive en Phase 2.
  const factureProposee = nouveauStatut === "COMPLETE";

  return { intervention: misAJour, factureProposee };
}

export async function ajouterRapportExecution(
  id: string,
  rapport: RapportExecutionInput,
  user: UtilisateurScope
) {
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) return null;

  const misAJour = await prisma.intervention.update({
    where: { id },
    data: {
      rapportExecution: {
        notes: rapport.notes ?? null,
        heureDebut: rapport.heureDebut?.toISOString() ?? null,
        heureFin: rapport.heureFin?.toISOString() ?? null,
        observations: rapport.observations ?? null,
      },
      dateExecution: rapport.heureFin ?? new Date(),
    },
  });

  if (rapport.photos.length > 0) {
    await prisma.media.createMany({
      data: rapport.photos.map((url) => ({ url, interventionId: id, type: intervention.type })),
    });
  }

  return misAJour;
}

// Interventions du jour groupées par technicien (master prompt 5) — la borne
// de journée passe par lib/dates.ts (§1.14), jamais un calcul UTC naïf.
export async function planningDuJour(date: Date) {
  const interventions = await prisma.intervention.findMany({
    where: { deletedAt: null, datePlanifiee: { gte: debutJourLocal(date), lte: finJourLocal(date) } },
    include: INCLUDE_STANDARD,
    orderBy: { datePlanifiee: "asc" },
  });

  const parTechnicien = new Map<string, typeof interventions>();
  for (const intervention of interventions) {
    if (intervention.techniciens.length === 0) {
      parTechnicien.set("non_assigne", [...(parTechnicien.get("non_assigne") ?? []), intervention]);
      continue;
    }
    for (const { technicienId } of intervention.techniciens) {
      parTechnicien.set(technicienId, [...(parTechnicien.get(technicienId) ?? []), intervention]);
    }
  }

  return Object.fromEntries(parTechnicien);
}
