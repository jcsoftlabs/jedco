import { z } from "zod";
import { typeServiceSchema } from "@/lib/schemas/enums";

export const presignGaleriePhotoSchema = z.object({
  nomFichier: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic"]),
});

export const creerMediaGalerieSchema = z.object({
  url: z.url(),
  legende: z.string().trim().max(200).optional(),
  type: typeServiceSchema.optional(),
});

export const modifierMediaGalerieSchema = z.object({
  publieGalerie: z.boolean().optional(),
  legende: z.string().trim().max(200).optional(),
});

export type CreerMediaGalerieInput = z.infer<typeof creerMediaGalerieSchema>;
export type ModifierMediaGalerieInput = z.infer<typeof modifierMediaGalerieSchema>;
