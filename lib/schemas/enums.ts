import { z } from "zod";

export const typeServiceSchema = z.enum([
  "VIDANGE",
  "COLLECTE",
  "TOILETTE_MOBILE",
  "PEST_CONTROL",
  "NETTOYAGE",
  "AUTRE",
]);

export const prioriteSchema = z.enum(["NORMALE", "URGENTE"]);

export const statutInterventionSchema = z.enum([
  "EN_ATTENTE",
  "PLANIFIE",
  "EN_COURS",
  "COMPLETE",
  "ANNULE",
]);
