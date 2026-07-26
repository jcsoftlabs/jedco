import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const creerArticleCatalogueSchema = z.object({
  nom: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional(),
  type: typeServiceSchema.optional(),
  // Indicatif — les tarifs réels varient par client/négociation, voir
  // prisma/schema.prisma. Saisi en HTG (pas en centimes).
  prixSuggereHTG: z.number().positive().optional(),
});

export const modifierArticleCatalogueSchema = creerArticleCatalogueSchema.partial().extend({
  actif: z.boolean().optional(),
});

export const listeCatalogueSchema = z.object({
  actif: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export type CreerArticleCatalogueInput = z.infer<typeof creerArticleCatalogueSchema>;
export type ModifierArticleCatalogueInput = z.infer<typeof modifierArticleCatalogueSchema>;
export type ListeCatalogueParams = z.infer<typeof listeCatalogueSchema>;
