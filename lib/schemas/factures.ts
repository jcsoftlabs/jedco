import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const modePaiementSchema = z.enum(["CASH", "VIREMENT", "CHEQUE"]);
export const statutFactureSchema = z.enum([
  "EN_ATTENTE",
  "PAYEE",
  "PARTIELLEMENT_PAYEE",
  "EN_RETARD",
  "ANNULEE",
]);

export const ligneFactureSchema = z.object({
  description: z.string().trim().min(1).max(500),
  service: typeServiceSchema.optional(),
  quantite: z.number().int().positive().default(1),
  // Prix saisi en HTG (pas en centimes) — converti en BigInt dans le service.
  prixUnitaireHTG: z.number().positive(),
});

export const creerFactureSchema = z.object({
  clientId: z.string().min(1),
  interventionId: z.string().optional(),
  contratId: z.string().optional(),
  lignes: z.array(ligneFactureSchema).min(1),
  tauxTaxePourcent: z.number().min(0).max(100).default(0),
  dateEcheanceJours: z.number().int().positive().max(365).default(30),
  notes: z.string().trim().max(2000).optional(),
});

// `lignes` et `tauxTaxePourcent` ne sont acceptés ensemble que lorsqu'on
// modifie les lignes : changer les lignes sans redonner le taux de taxe
// laisserait le service deviner un taux implicite, source d'erreur silencieuse
// sur un document comptable. Le formulaire d'édition envoie systématiquement
// les deux ensemble (voir EditerFactureModal.tsx).
export const modifierFactureSchema = z
  .object({
    notes: z.string().trim().max(2000).optional(),
    dateEcheance: z.coerce.date().optional(),
    lignes: z.array(ligneFactureSchema).min(1).optional(),
    tauxTaxePourcent: z.number().min(0).max(100).optional(),
  })
  .refine((v) => (v.lignes === undefined) === (v.tauxTaxePourcent === undefined), {
    message: "lignes et tauxTaxePourcent doivent être fournis ensemble",
  });

export const listeFacturesSchema = z.object({
  clientId: z.string().optional(),
  statut: statutFactureSchema.optional(),
  dateDebut: z.coerce.date().optional(),
  dateFin: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreerFactureInput = z.infer<typeof creerFactureSchema>;
export type ModifierFactureInput = z.infer<typeof modifierFactureSchema>;
export type ListeFacturesParams = z.infer<typeof listeFacturesSchema>;
