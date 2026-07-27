import { z } from "zod";

export const creerAgentSupportSchema = z.object({
  email: z.email(),
  // Aligné sur creerTechnicienSchema (12) — un agent de support a un compte
  // du même backoffice qu'un technicien, il n'y a aucune raison qu'il ait le
  // droit à un mot de passe plus faible.
  motDePasse: z.string().min(12, "Le mot de passe doit faire au moins 12 caractères"),
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  telephone: z.string().trim().max(30).optional(),
});

export type CreerAgentSupportInput = z.infer<typeof creerAgentSupportSchema>;
