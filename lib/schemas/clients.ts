import { z } from "zod";

export const typeClientSchema = z.enum(["PARTICULIER", "ENTREPRISE", "INSTITUTION", "ONG"]);

export const creerClientSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  type: typeClientSchema.default("PARTICULIER"),
  telephone: z.string().trim().min(1).max(30),
  email: z.email().optional(),
  adresse: z.string().trim().max(500).optional(),
  ville: z.string().trim().min(1).max(100).default("Port-au-Prince"),
  notes: z.string().trim().max(2000).optional(),
});

export const modifierClientSchema = creerClientSchema.partial();

// §1.19 du plan : plafond de pagination pour éviter qu'une liste sans limite
// ne devienne un vecteur de déni de service accidentel.
export const listeClientsSchema = z.object({
  ville: z.string().optional(),
  type: typeClientSchema.optional(),
  actif: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerClientInput = z.infer<typeof creerClientSchema>;
export type ModifierClientInput = z.infer<typeof modifierClientSchema>;
export type ListeClientsParams = z.infer<typeof listeClientsSchema>;
