import { z } from "zod";
import { modePaiementSchema } from "@/lib/schemas/factures";

export const enregistrerPaiementSchema = z.object({
  factureId: z.string().min(1),
  montantHTG: z.number().positive(),
  mode: modePaiementSchema,
  reference: z.string().trim().max(200).optional(),
  // Fournie par le client (§1.5) — un hash stable du formulaire soumis, ou un
  // UUID généré une fois côté client et réutilisé à chaque tentative.
  idempotencyKey: z.string().trim().min(1).max(200),
});

export type EnregistrerPaiementInput = z.infer<typeof enregistrerPaiementSchema>;
