import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const statutDevisSchema = z.enum([
  "BROUILLON",
  "ENVOYE",
  "ACCEPTE",
  "REFUSE",
  "EXPIRE",
  "CONVERTI",
]);

export const ligneDevisSchema = z.object({
  description: z.string().trim().min(1).max(500),
  service: typeServiceSchema.optional(),
  quantite: z.number().int().positive().default(1),
  // Prix saisi en HTG (pas en centimes) — converti en BigInt dans le service.
  prixUnitaireHTG: z.number().positive(),
});

export const creerDevisSchema = z.object({
  clientId: z.string().min(1),
  lignes: z.array(ligneDevisSchema).min(1),
  tauxTaxePourcent: z.number().min(0).max(100).default(0),
  dateValiditeJours: z.number().int().positive().max(365).default(30),
  notes: z.string().trim().max(2000).optional(),
});

export const modifierDevisSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
  dateValidite: z.coerce.date().optional(),
  statut: z.enum(["ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"]).optional(),
});

export const listeDevisSchema = z.object({
  clientId: z.string().optional(),
  statut: statutDevisSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerDevisInput = z.infer<typeof creerDevisSchema>;
export type ModifierDevisInput = z.infer<typeof modifierDevisSchema>;
export type ListeDevisParams = z.infer<typeof listeDevisSchema>;
