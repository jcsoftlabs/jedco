import { prisma } from "@/lib/db";
import { debutJourLocal } from "@/lib/dates";
import type { Prisma } from "@/app/generated/prisma/client";

export type PeriodeRapport = { dateDebut?: Date; dateFin?: Date };

// dateFin arrive à minuit (borne d'un jour civil) — voir la même correction
// dans lib/services/factures.ts. Un `lte` brut exclurait les enregistrements
// du dernier jour de la période après minuit.
function finDeJournee(dateFin?: Date): Date | undefined {
  return dateFin ? new Date(dateFin.getTime() + 24 * 60 * 60 * 1000 - 1) : undefined;
}

// Interventions ventilées par service (type) et par ville, sur une période
// optionnelle — deux répartitions distinctes plutôt qu'une matrice
// service×ville, même angle que revenusParService/revenusParVille sur le
// tableau de bord Facturation (§3.5), pour rester cohérent avec le reste du
// système.
export async function statsInterventionsParDimension(periode: PeriodeRapport) {
  const { dateDebut } = periode;
  const finPeriode = finDeJournee(periode.dateFin);

  const where: Prisma.InterventionWhereInput = {
    deletedAt: null,
    ...(dateDebut || finPeriode
      ? {
          createdAt: {
            ...(dateDebut ? { gte: dateDebut } : {}),
            ...(finPeriode ? { lte: finPeriode } : {}),
          },
        }
      : {}),
  };

  const [parTypeBrut, parVilleBrut] = await Promise.all([
    prisma.intervention.groupBy({ by: ["type"], where, _count: true }),
    prisma.intervention.groupBy({ by: ["ville"], where, _count: true }),
  ]);

  return {
    parType: Object.fromEntries(parTypeBrut.map((l) => [l.type, l._count])),
    parVille: Object.fromEntries(parVilleBrut.map((l) => [l.ville, l._count])),
  };
}

export type LignePerformanceTechnicien = {
  technicienId: string;
  matricule: string;
  nom: string;
  prenom: string;
  interventionsAssignees: number;
  interventionsCompletees: number;
  tauxCompletionPourcent: number | null;
  joursPresents: number;
  joursPointes: number;
};

// Rendement par technicien : interventions assignées vs complétées sur la
// période, et assiduité (Presence, §Module Présence). Aucun suivi de durée
// réelle d'intervention n'existe en base (seuls datePlanifiee et
// dateExecution, pas d'horodatage début/fin) — le "rendement" se limite donc
// à un taux de complétion et de présence, pas à un temps moyen par
// intervention.
export async function statsPerformanceEquipes(periode: PeriodeRapport): Promise<LignePerformanceTechnicien[]> {
  const { dateDebut } = periode;
  const finPeriode = finDeJournee(periode.dateFin);
  const bornesActives = Boolean(dateDebut || finPeriode);

  const techniciens = await prisma.technicien.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { nom: true, prenom: true } },
      interventions: {
        where: {
          intervention: {
            deletedAt: null,
            ...(bornesActives
              ? {
                  createdAt: {
                    ...(dateDebut ? { gte: dateDebut } : {}),
                    ...(finPeriode ? { lte: finPeriode } : {}),
                  },
                }
              : {}),
          },
        },
        select: { intervention: { select: { statut: true } } },
      },
      presences: {
        where: bornesActives
          ? {
              date: {
                ...(dateDebut ? { gte: dateDebut } : {}),
                ...(finPeriode ? { lte: finPeriode } : {}),
              },
            }
          : undefined,
      },
    },
    orderBy: { matricule: "asc" },
  });

  return techniciens.map((t) => {
    const interventionsAssignees = t.interventions.length;
    const interventionsCompletees = t.interventions.filter((it) => it.intervention.statut === "COMPLETE").length;
    const joursPresents = t.presences.filter((p) => p.present).length;

    return {
      technicienId: t.id,
      matricule: t.matricule,
      nom: t.user.nom,
      prenom: t.user.prenom,
      interventionsAssignees,
      interventionsCompletees,
      tauxCompletionPourcent:
        interventionsAssignees > 0 ? Math.round((interventionsCompletees / interventionsAssignees) * 100) : null,
      joursPresents,
      joursPointes: t.presences.length,
    };
  });
}

export type OccupationFlotte = {
  nombreVehicules: number;
  joursPeriode: number;
  joursUtilises: number;
  joursDisponibles: number;
  tauxOccupationPourcent: number;
};

// Taux d'occupation = jours-véhicule effectivement utilisés (au moins une
// intervention planifiée ce jour-là) / jours-véhicule disponibles sur la
// période (flotte totale × nombre de jours). Contrairement à statsFlotte()
// (lib/services/vehicules.ts), qui ne donne qu'un instantané du statut
// courant, ce calcul porte sur une période bornée — sans dateDebut/dateFin
// définis, "taux d'occupation" n'a pas de sens.
export async function tauxOccupationFlotte(periode: { dateDebut: Date; dateFin: Date }): Promise<OccupationFlotte> {
  const finPeriode = finDeJournee(periode.dateFin)!;

  const [nombreVehicules, interventions] = await Promise.all([
    prisma.vehicule.count({ where: { deletedAt: null } }),
    prisma.intervention.findMany({
      where: {
        deletedAt: null,
        vehiculeId: { not: null },
        // Une intervention annulée n'a jamais réellement mobilisé le
        // véhicule — la compter mènerait à un taux d'occupation gonflé par
        // des réservations qui n'ont jamais eu lieu.
        statut: { not: "ANNULE" },
        datePlanifiee: { gte: periode.dateDebut, lte: finPeriode },
      },
      select: { vehiculeId: true, datePlanifiee: true },
    }),
  ]);

  const joursUtilises = new Set(
    interventions.map((i) => `${i.vehiculeId}-${debutJourLocal(i.datePlanifiee!).getTime()}`)
  ).size;

  const joursPeriode = Math.max(1, Math.round((finPeriode.getTime() - periode.dateDebut.getTime()) / 86_400_000));
  const joursDisponibles = nombreVehicules * joursPeriode;

  return {
    nombreVehicules,
    joursPeriode,
    joursUtilises,
    joursDisponibles,
    tauxOccupationPourcent: joursDisponibles > 0 ? Math.round((joursUtilises / joursDisponibles) * 100) : 0,
  };
}

export type RapportActivite = {
  dimensions: Awaited<ReturnType<typeof statsInterventionsParDimension>>;
  performance: LignePerformanceTechnicien[];
  occupation: OccupationFlotte;
};

// Fenêtre par défaut pour l'occupation de la flotte quand aucune période
// n'est choisie : les 30 derniers jours glissants, cohérent avec les autres
// fenêtres par défaut du système (statsParCanal, alertes de contrat).
function periodeOccupationParDefaut(periode: PeriodeRapport): { dateDebut: Date; dateFin: Date } {
  const dateFin = periode.dateFin ?? new Date();
  const dateDebut = periode.dateDebut ?? new Date(dateFin.getTime() - 30 * 86_400_000);
  return { dateDebut, dateFin };
}

export async function rapportActivite(periode: PeriodeRapport): Promise<RapportActivite> {
  const [dimensions, performance, occupation] = await Promise.all([
    statsInterventionsParDimension(periode),
    statsPerformanceEquipes(periode),
    tauxOccupationFlotte(periodeOccupationParDefaut(periode)),
  ]);

  return { dimensions, performance, occupation };
}

// ─── Export CSV ───────────────────────────────────────────────────────────
// Même utilitaire d'échappement que lib/csv.ts, mais plusieurs sections dans
// un seul fichier (le rapport combine 4 tableaux hétérogènes) — genererCsv()
// ne modélise qu'un seul tableau, donc on compose ici plutôt que de le
// généraliser pour un unique appelant.
function echapperChamp(valeur: string | number | null | undefined): string {
  const s = valeur === null || valeur === undefined ? "" : String(valeur);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function blocCsv(titre: string, entetes: string[], lignes: (string | number | null)[][]): string {
  return [titre, entetes.join(","), ...lignes.map((l) => l.map(echapperChamp).join(","))].join("\r\n");
}

const BOM_UTF8 = "﻿";

export async function exporterRapportCsv(periode: PeriodeRapport): Promise<string> {
  const { dimensions, performance, occupation } = await rapportActivite(periode);

  const blocs = [
    blocCsv(
      "INTERVENTIONS PAR SERVICE",
      ["Service", "Nombre"],
      Object.entries(dimensions.parType).sort((a, b) => b[1] - a[1])
    ),
    blocCsv(
      "INTERVENTIONS PAR VILLE",
      ["Ville", "Nombre"],
      Object.entries(dimensions.parVille).sort((a, b) => b[1] - a[1])
    ),
    blocCsv(
      "PERFORMANCE DES ÉQUIPES TERRAIN",
      ["Matricule", "Technicien", "Assignées", "Complétées", "Taux complétion %", "Jours présents", "Jours pointés"],
      performance.map((p) => [
        p.matricule,
        `${p.prenom} ${p.nom}`,
        p.interventionsAssignees,
        p.interventionsCompletees,
        p.tauxCompletionPourcent,
        p.joursPresents,
        p.joursPointes,
      ])
    ),
    blocCsv(
      "OCCUPATION DE LA FLOTTE",
      ["Véhicules", "Jours de période", "Jours-véhicule utilisés", "Jours-véhicule disponibles", "Taux occupation %"],
      [
        [
          occupation.nombreVehicules,
          occupation.joursPeriode,
          occupation.joursUtilises,
          occupation.joursDisponibles,
          occupation.tauxOccupationPourcent,
        ],
      ]
    ),
  ];

  return BOM_UTF8 + blocs.join("\r\n\r\n");
}
