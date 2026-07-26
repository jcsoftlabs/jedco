import { z } from "zod";

export const creerTemoignageSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(200),
  note: z.number().int().min(1).max(5).default(5),
  commentaire: z.string().trim().min(1).max(1000),
  ordre: z.number().int().default(0),
});

export const modifierTemoignageSchema = creerTemoignageSchema.partial().extend({
  actif: z.boolean().optional(),
});

export type CreerTemoignageInput = z.infer<typeof creerTemoignageSchema>;
export type ModifierTemoignageInput = z.infer<typeof modifierTemoignageSchema>;
