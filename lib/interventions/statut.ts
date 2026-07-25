import type { StatutIntervention } from "@/app/generated/prisma/enums";

// Machine à états centralisée en un seul endroit (§7.3 du master prompt) —
// jamais de `if` dispersés dans les routes ou services pour valider une
// transition de statut.
//
//   EN_ATTENTE → PLANIFIE → EN_COURS → COMPLETE
//                   ↓           ↓
//                 ANNULE ←──────┘
//       (EN_ATTENTE peut aussi être annulé directement)

const TRANSITIONS: Record<StatutIntervention, StatutIntervention[]> = {
  EN_ATTENTE: ["PLANIFIE", "ANNULE"],
  PLANIFIE: ["EN_COURS", "ANNULE"],
  EN_COURS: ["COMPLETE", "ANNULE"],
  COMPLETE: [],
  ANNULE: [],
};

export function transitionValide(depuis: StatutIntervention, vers: StatutIntervention): boolean {
  return TRANSITIONS[depuis].includes(vers);
}

// Statuts qui bloquent effectivement un créneau (véhicule/technicien) —
// doit rester synchronisé avec le WHERE des contraintes EXCLUDE et des
// triggers de la migration 20260725023340_exclusion_double_booking.
export const STATUTS_ACTIFS: StatutIntervention[] = ["EN_ATTENTE", "PLANIFIE", "EN_COURS"];
