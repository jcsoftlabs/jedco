import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const typeContratSchema = z.enum(["MENSUEL", "TRIMESTRIEL", "ANNUEL", "PONCTUEL"]);
export const statutContratSchema = z.enum(["ACTIF", "EXPIRE", "SUSPENDU", "RESILIE"]);
export { typeServiceSchema };

export const creerContratSchema = z
  .object({
    clientId: z.string().min(1),
    type: typeContratSchema,
    services: z.array(typeServiceSchema).min(1),
    // Montant saisi en HTG (pas en centimes) — converti en BigInt centimes
    // dans le service via htgToCentimes (§1.7).
    montantHTG: z.number().positive(),
    dateDebut: z.coerce.date(),
    dateFin: z.coerce.date(),
    renouvellementAuto: z.boolean().default(false),
  })
  .refine((data) => data.dateFin > data.dateDebut, {
    message: "La date de fin doit être postérieure à la date de début",
    path: ["dateFin"],
  });

export const modifierContratSchema = z.object({
  type: typeContratSchema.optional(),
  services: z.array(typeServiceSchema).min(1).optional(),
  montantHTG: z.number().positive().optional(),
  dateDebut: z.coerce.date().optional(),
  dateFin: z.coerce.date().optional(),
  statut: statutContratSchema.optional(),
  renouvellementAuto: z.boolean().optional(),
});

export const listeContratsSchema = z.object({
  clientId: z.string().optional(),
  statut: statutContratSchema.optional(),
  type: typeContratSchema.optional(),
  expirantDansJours: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerContratInput = z.infer<typeof creerContratSchema>;
export type ModifierContratInput = z.infer<typeof modifierContratSchema>;
export type ListeContratsParams = z.infer<typeof listeContratsSchema>;
