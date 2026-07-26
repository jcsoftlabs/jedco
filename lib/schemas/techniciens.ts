import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

// Même seuil que scripts/bootstrap-admin.ts — cohérence entre les deux seules
// voies de création de compte avec mot de passe.
export const creerTechnicienSchema = z.object({
  email: z.email(),
  motDePasse: z.string().min(12, "Le mot de passe doit faire au moins 12 caractères"),
  prenom: z.string().trim().min(1).max(100),
  nom: z.string().trim().min(1).max(100),
  telephone: z.string().trim().max(30).optional(),
  specialites: z.array(typeServiceSchema).default([]),
  zonesAssignees: z.array(z.string().trim().min(1).max(100)).default([]),
});

export const modifierTechnicienSchema = z.object({
  specialites: z.array(typeServiceSchema).optional(),
  zonesAssignees: z.array(z.string().trim().min(1).max(100)).optional(),
  disponible: z.boolean().optional(),
});

export type CreerTechnicienInput = z.infer<typeof creerTechnicienSchema>;
export type ModifierTechnicienInput = z.infer<typeof modifierTechnicienSchema>;
