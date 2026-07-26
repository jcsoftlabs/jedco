import { z } from "zod";

// Depuis la migration types_reference, les types de service et de véhicule ne
// sont plus des énumérations figées mais des tables administrables. Zod ne
// peut donc plus valider la liste ici : il vérifie la FORME (chaîne non vide,
// format de code), et l'appartenance à la liste est contrôlée par
// verifierTypesService / verifierTypeVehicule dans
// lib/services/types-reference.ts, au plus près de l'écriture en base.
const codeReference = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9_]+$/, "Code invalide (majuscules, chiffres et tirets bas uniquement)");

export const typeServiceSchema = codeReference;
export const typeVehiculeSchema = codeReference;

export const prioriteSchema = z.enum(["NORMALE", "URGENTE"]);

export const statutInterventionSchema = z.enum([
  "EN_ATTENTE",
  "PLANIFIE",
  "EN_COURS",
  "COMPLETE",
  "ANNULE",
]);

// ─── Administration des tables de référence ─────────────────────────────────

export const creerTypeReferenceSchema = z.object({
  libelle: z.string().trim().min(1).max(100),
  // Facultatif : dérivé du libellé par normaliserCode() quand il est absent.
  code: z.string().trim().max(50).optional(),
  ordre: z.number().int().min(0).max(999).default(0),
});

export const modifierTypeReferenceSchema = z.object({
  libelle: z.string().trim().min(1).max(100).optional(),
  actif: z.boolean().optional(),
  ordre: z.number().int().min(0).max(999).optional(),
});

export type CreerTypeReferenceInput = z.infer<typeof creerTypeReferenceSchema>;
export type ModifierTypeReferenceInput = z.infer<typeof modifierTypeReferenceSchema>;
