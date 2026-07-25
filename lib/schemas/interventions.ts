import { z } from "zod";
import { typeServiceSchema, prioriteSchema, statutInterventionSchema } from "@/lib/schemas/enums";

export { typeServiceSchema, prioriteSchema, statutInterventionSchema };

const DUREE_MAX_MIN = 24 * 60;

export const creerInterventionSchema = z.object({
  clientId: z.string().min(1),
  contratId: z.string().optional(),
  type: typeServiceSchema,
  description: z.string().trim().max(2000).optional(),
  adresse: z.string().trim().min(1).max(500),
  ville: z.string().trim().min(1).max(100),
  priorite: prioriteSchema.default("NORMALE"),
  datePlanifiee: z.coerce.date().optional(),
  dureeEstimeeMin: z.coerce.number().int().positive().max(DUREE_MAX_MIN).default(60),
  vehiculeId: z.string().optional(),
  technicienIds: z.array(z.string()).default([]),
});

export const modifierInterventionSchema = z.object({
  description: z.string().trim().max(2000).optional(),
  adresse: z.string().trim().min(1).max(500).optional(),
  ville: z.string().trim().min(1).max(100).optional(),
  priorite: prioriteSchema.optional(),
  datePlanifiee: z.coerce.date().nullable().optional(),
  dureeEstimeeMin: z.coerce.number().int().positive().max(DUREE_MAX_MIN).optional(),
  vehiculeId: z.string().nullable().optional(),
});

export const changerStatutSchema = z.object({ statut: statutInterventionSchema });

export const rapportExecutionSchema = z.object({
  notes: z.string().trim().max(5000).optional(),
  heureDebut: z.coerce.date().optional(),
  heureFin: z.coerce.date().optional(),
  observations: z.string().trim().max(5000).optional(),
  // URLs déjà uploadées vers R2 via /photos/presign — le serveur ne reçoit
  // jamais l'octet du fichier lui-même (§1.2, §2 du plan).
  photos: z.array(z.url()).default([]),
});

export const presignPhotoSchema = z.object({
  nomFichier: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
});

export const listeInterventionsSchema = z.object({
  statut: statutInterventionSchema.optional(),
  type: typeServiceSchema.optional(),
  ville: z.string().optional(),
  technicienId: z.string().optional(),
  date: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerInterventionInput = z.infer<typeof creerInterventionSchema>;
export type ModifierInterventionInput = z.infer<typeof modifierInterventionSchema>;
export type RapportExecutionInput = z.infer<typeof rapportExecutionSchema>;
export type ListeInterventionsParams = z.infer<typeof listeInterventionsSchema>;
