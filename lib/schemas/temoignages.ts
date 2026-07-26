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

// Formulaire public (page vitrine) : ni `ordre` ni `actif` ne sont exposés —
// un témoignage soumis depuis le site s'affiche immédiatement (pas de
// modération, choix explicite pour ce lancement), toujours en fin de liste.
export const creerTemoignagePublicSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  type: z.string().trim().min(1).max(200),
  note: z.number().int().min(1).max(5).default(5),
  commentaire: z.string().trim().min(1).max(1000),
});

export type CreerTemoignageInput = z.infer<typeof creerTemoignageSchema>;
export type ModifierTemoignageInput = z.infer<typeof modifierTemoignageSchema>;
export type CreerTemoignagePublicInput = z.infer<typeof creerTemoignagePublicSchema>;
