import { z } from "zod";

export const demanderCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
});

export const verifierCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  code: z.string().regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
});

export type DemanderCodeInput = z.infer<typeof demanderCodeSchema>;
export type VerifierCodeInput = z.infer<typeof verifierCodeSchema>;
