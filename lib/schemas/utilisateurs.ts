import { z } from "zod";

// Même seuil que creerTechnicienSchema et scripts/bootstrap-admin.ts : un mot
// de passe changé ne doit pas pouvoir être plus faible que celui qu'on avait
// exigé à la création du compte.
export const LONGUEUR_MIN_MOT_DE_PASSE = 12;

const motDePasse = z
  .string()
  .min(LONGUEUR_MIN_MOT_DE_PASSE, `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères`)
  .max(200);

export const changerMotDePasseSchema = z.object({
  actuel: z.string().min(1, "Mot de passe actuel requis"),
  nouveau: motDePasse,
});

export const reinitialiserMotDePasseSchema = z.object({
  nouveau: motDePasse,
});

export const activationCompteSchema = z.object({
  actif: z.boolean(),
});

export type ChangerMotDePasseInput = z.infer<typeof changerMotDePasseSchema>;
