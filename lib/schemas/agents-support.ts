import { z } from "zod";

export const creerAgentSupportSchema = z.object({
  email: z.email(),
  motDePasse: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  telephone: z.string().trim().max(30).optional(),
});

export type CreerAgentSupportInput = z.infer<typeof creerAgentSupportSchema>;
