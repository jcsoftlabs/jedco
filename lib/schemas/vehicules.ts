import { z } from "zod";
import { typeVehiculeSchema } from "@/lib/schemas/enums";

export { typeVehiculeSchema };
export const statutVehiculeSchema = z.enum(["DISPONIBLE", "EN_SERVICE", "EN_MAINTENANCE", "HORS_SERVICE"]);
export const typeEntretienSchema = z.enum([
  "VIDANGE_MOTEUR",
  "REVISION",
  "REPARATION",
  "PNEUS",
  "CARROSSERIE",
  "AUTRE",
]);

// L'immatriculation est l'identifiant unique métier du véhicule : normalisée
// en majuscules sans espaces superflus pour que « ab-123-cd », « AB 123 CD »
// et « AB-123-CD » ne créent pas trois véhicules distincts échappant à la
// contrainte d'unicité de la base.
const immatriculationSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((v) => v.toUpperCase().replace(/\s+/g, " "));

export const creerVehiculeSchema = z.object({
  immatriculation: immatriculationSchema,
  marque: z.string().trim().min(1).max(100),
  modele: z.string().trim().min(1).max(100),
  type: typeVehiculeSchema,
  kilometrage: z.number().int().min(0).default(0),
  prochainEntretien: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const modifierVehiculeSchema = z.object({
  immatriculation: immatriculationSchema.optional(),
  marque: z.string().trim().min(1).max(100).optional(),
  modele: z.string().trim().min(1).max(100).optional(),
  type: typeVehiculeSchema.optional(),
  statut: statutVehiculeSchema.optional(),
  kilometrage: z.number().int().min(0).optional(),
  prochainEntretien: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const enregistrerEntretienSchema = z.object({
  type: typeEntretienSchema,
  description: z.string().trim().max(1000).optional(),
  // Saisi en HTG (pas en centimes) — converti en BigInt dans le service.
  coutHTG: z.number().min(0).default(0),
  kilometrage: z.number().int().min(0).optional(),
  dateEntretien: z.coerce.date().optional(),
  prochainEntretien: z.coerce.date().optional(),
  // Remet le véhicule en service à la fin de l'entretien — le cas courant
  // quand on saisit un entretien déjà terminé.
  remettreEnService: z.boolean().default(false),
});

export const listeVehiculesSchema = z.object({
  statut: statutVehiculeSchema.optional(),
  type: typeVehiculeSchema.optional(),
});

export type CreerVehiculeInput = z.infer<typeof creerVehiculeSchema>;
export type ModifierVehiculeInput = z.infer<typeof modifierVehiculeSchema>;
export type EnregistrerEntretienInput = z.infer<typeof enregistrerEntretienSchema>;
export type ListeVehiculesParams = z.infer<typeof listeVehiculesSchema>;
