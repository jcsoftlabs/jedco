import { prisma } from "@/lib/db";
import { htgToCentimes } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import { STATUTS_ACTIFS } from "@/lib/interventions/statut";
import { verifierTypeVehicule } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { StatutVehicule } from "@/app/generated/prisma/enums";
import type {
  CreerVehiculeInput,
  EnregistrerEntretienInput,
  ListeVehiculesParams,
  ModifierVehiculeInput,
} from "@/lib/schemas/vehicules";

// Statuts dans lesquels un véhicule ne peut pas partir en intervention.
// Exporté pour que le module Interventions applique exactement la même règle
// plutôt que d'en redéfinir une copie qui pourrait diverger.
export const STATUTS_VEHICULE_INDISPONIBLE: StatutVehicule[] = ["EN_MAINTENANCE", "HORS_SERVICE"];

// Normalisation appliquée ICI et pas seulement dans le schéma Zod : l'unicité
// de l'immatriculation est une garantie du service, elle ne doit pas dépendre
// du point d'entrée. Un appel direct au service (script de reprise, seed,
// import) contournerait sinon le contrôle de doublon — « ab-123 » et
// « AB-123 » créeraient deux véhicules pour la même plaque.
export function normaliserImmatriculation(valeur: string): string {
  return valeur.trim().toUpperCase().replace(/\s+/g, " ");
}

export async function listerVehicules(params: ListeVehiculesParams = {}) {
  const where: Prisma.VehiculeWhereInput = {
    deletedAt: null,
    ...(params.statut ? { statut: params.statut } : {}),
    ...(params.type ? { type: params.type } : {}),
  };

  return prisma.vehicule.findMany({
    where,
    orderBy: { immatriculation: "asc" },
    include: {
      _count: { select: { interventions: true } },
    },
  });
}

export async function obtenirVehicule(id: string) {
  return prisma.vehicule.findFirst({
    where: { id, deletedAt: null },
    include: {
      entretiens: { orderBy: { dateEntretien: "desc" }, take: 50 },
      interventions: {
        where: { deletedAt: null, statut: { in: STATUTS_ACTIFS } },
        orderBy: { datePlanifiee: "asc" },
        include: { client: { select: { nom: true } } },
        take: 20,
      },
    },
  });
}

export async function creerVehicule(input: CreerVehiculeInput) {
  await verifierTypeVehicule(input.type);
  const immatriculation = normaliserImmatriculation(input.immatriculation);

  const existant = await prisma.vehicule.findUnique({ where: { immatriculation } });
  if (existant) {
    throw new ErreurMetier(`Un véhicule est déjà enregistré avec l'immatriculation ${immatriculation}`, 409);
  }

  return prisma.vehicule.create({ data: { ...input, immatriculation } });
}

export async function modifierVehicule(id: string, input: ModifierVehiculeInput) {
  const vehicule = await prisma.vehicule.findFirst({ where: { id, deletedAt: null } });
  if (!vehicule) return null;

  if (input.type) await verifierTypeVehicule(input.type);

  const immatriculation = input.immatriculation
    ? normaliserImmatriculation(input.immatriculation)
    : undefined;

  if (immatriculation && immatriculation !== vehicule.immatriculation) {
    const collision = await prisma.vehicule.findUnique({ where: { immatriculation } });
    if (collision) {
      throw new ErreurMetier(`Un véhicule est déjà enregistré avec l'immatriculation ${immatriculation}`, 409);
    }
  }

  // Le compteur kilométrique ne redescend jamais : une valeur inférieure est
  // une faute de frappe, pas une correction légitime. La refuser évite de
  // fausser silencieusement le suivi d'usure et les échéances d'entretien.
  if (input.kilometrage !== undefined && input.kilometrage < vehicule.kilometrage) {
    throw new ErreurMetier(
      `Le kilométrage ne peut pas diminuer (actuel : ${vehicule.kilometrage} km)`,
      400
    );
  }

  if (input.statut && STATUTS_VEHICULE_INDISPONIBLE.includes(input.statut)) {
    await verifierAucuneInterventionActive(id, input.statut);
  }

  return prisma.vehicule.update({ where: { id }, data: input });
}

// Mettre un véhicule en maintenance alors qu'il est encore affecté à des
// interventions à venir laisserait ces interventions planifiées sur un camion
// indisponible, sans que personne ne s'en aperçoive avant le jour J. On refuse
// et on nomme les interventions à replanifier d'abord.
async function verifierAucuneInterventionActive(vehiculeId: string, statutVise: StatutVehicule) {
  const actives = await prisma.intervention.findMany({
    where: { vehiculeId, deletedAt: null, statut: { in: STATUTS_ACTIFS } },
    select: { reference: true },
    take: 5,
  });

  if (actives.length > 0) {
    const refs = actives.map((i) => i.reference).join(", ");
    throw new ErreurMetier(
      `Impossible de passer ce véhicule en ${statutVise} : il est encore affecté à ${actives.length} intervention(s) active(s) (${refs}). Replanifiez-les d'abord.`,
      409
    );
  }
}

// Enregistre un passage à l'atelier ET met à jour le véhicule (kilométrage,
// dernier/prochain entretien) dans une seule transaction : une ligne
// d'historique sans mise à jour du véhicule, ou l'inverse, laisserait la
// fiche véhicule en désaccord avec son propre historique.
export async function enregistrerEntretien(
  vehiculeId: string,
  input: EnregistrerEntretienInput,
  createdBy?: string
) {
  const vehicule = await prisma.vehicule.findFirst({ where: { id: vehiculeId, deletedAt: null } });
  if (!vehicule) return null;

  if (input.kilometrage !== undefined && input.kilometrage < vehicule.kilometrage) {
    throw new ErreurMetier(
      `Le kilométrage relevé ne peut pas être inférieur au compteur actuel (${vehicule.kilometrage} km)`,
      400
    );
  }

  const dateEntretien = input.dateEntretien ?? new Date();

  return prisma.$transaction(async (tx) => {
    const entretien = await tx.entretienVehicule.create({
      data: {
        vehiculeId,
        type: input.type,
        description: input.description,
        coutHTG: htgToCentimes(input.coutHTG),
        kilometrage: input.kilometrage,
        dateEntretien,
        prochainEntretien: input.prochainEntretien,
        createdBy,
      },
    });

    await tx.vehicule.update({
      where: { id: vehiculeId },
      data: {
        dernierEntretien: dateEntretien,
        ...(input.prochainEntretien ? { prochainEntretien: input.prochainEntretien } : {}),
        ...(input.kilometrage !== undefined ? { kilometrage: input.kilometrage } : {}),
        ...(input.remettreEnService ? { statut: "DISPONIBLE" as const } : {}),
      },
    });

    return entretien;
  });
}

// Soft delete (§1.12) — un véhicule reste référencé par les interventions
// passées, le supprimer physiquement casserait leur historique.
export async function supprimerVehicule(id: string) {
  const vehicule = await prisma.vehicule.findFirst({ where: { id, deletedAt: null } });
  if (!vehicule) return null;

  await verifierAucuneInterventionActive(id, "HORS_SERVICE");

  return prisma.vehicule.update({
    where: { id },
    data: { deletedAt: new Date(), statut: "HORS_SERVICE" },
  });
}

// Indicateurs de flotte pour le tableau de bord : compteurs par statut plus
// les véhicules dont l'échéance d'entretien est dépassée ou imminente.
export async function statsFlotte(maintenant: Date = new Date()) {
  const dansTrenteJours = new Date(maintenant.getTime() + 30 * 86_400_000);

  const [parStatutBrut, entretiensDus, coutTotal] = await Promise.all([
    prisma.vehicule.groupBy({ by: ["statut"], where: { deletedAt: null }, _count: true }),
    prisma.vehicule.findMany({
      where: {
        deletedAt: null,
        prochainEntretien: { not: null, lte: dansTrenteJours },
      },
      select: { id: true, immatriculation: true, prochainEntretien: true },
      orderBy: { prochainEntretien: "asc" },
    }),
    prisma.entretienVehicule.aggregate({ _sum: { coutHTG: true } }),
  ]);

  const parStatut = Object.fromEntries(parStatutBrut.map((l) => [l.statut, l._count]));

  return {
    parStatut,
    total: Object.values(parStatut).reduce((s, n) => s + n, 0),
    disponibles: parStatut.DISPONIBLE ?? 0,
    enMaintenance: parStatut.EN_MAINTENANCE ?? 0,
    entretiensDus,
    coutEntretienTotalHTG: coutTotal._sum.coutHTG ?? 0n,
  };
}
