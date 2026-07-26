import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

// Formulaire public (page d'accueil, sans authentification) — validation
// stricte car c'est la seule route de l'app ouverte à n'importe qui sur
// Internet, pas seulement à un utilisateur déjà authentifié.
export const creerDemandeDevisSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  telephone: z.string().trim().min(1).max(30),
  email: z.email().optional(),
  service: typeServiceSchema,
  ville: z.string().trim().min(1).max(100),
  message: z.string().trim().max(2000).optional(),
});

export const listeDemandesDevisSchema = z.object({
  traite: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreerDemandeDevisInput = z.infer<typeof creerDemandeDevisSchema>;
export type ListeDemandesDevisParams = z.infer<typeof listeDemandesDevisSchema>;
