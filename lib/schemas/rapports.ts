import { z } from "zod";

export const periodeRapportSchema = z.object({
  dateDebut: z.coerce.date().optional(),
  dateFin: z.coerce.date().optional(),
});

export type PeriodeRapportInput = z.infer<typeof periodeRapportSchema>;
