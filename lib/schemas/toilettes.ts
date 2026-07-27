import { z } from "zod";

export const statutToiletteSchema = z.enum(["DISPONIBLE", "LOUEE", "EN_MAINTENANCE"]);

export const creerToiletteSchema = z.object({
  localisationActuelle: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const modifierToiletteSchema = z.object({
  statut: statutToiletteSchema.optional(),
  localisationActuelle: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

// Démarrer une location : le client et la période. La toilette doit être
// DISPONIBLE avant l'appel — vérifié dans le service, pas ici, puisque ça
// dépend de l'état en base au moment de l'appel.
export const demarrerLocationSchema = z.object({
  clientId: z.string().min(1),
  dateDebutLocation: z.coerce.date(),
  dateFinLocation: z.coerce.date().optional(),
  localisationActuelle: z.string().trim().max(200).optional(),
});

export const listeToilettesSchema = z.object({
  statut: statutToiletteSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreerToiletteInput = z.infer<typeof creerToiletteSchema>;
export type ModifierToiletteInput = z.infer<typeof modifierToiletteSchema>;
export type DemarrerLocationInput = z.infer<typeof demarrerLocationSchema>;
export type ListeToilettesParams = z.infer<typeof listeToilettesSchema>;
