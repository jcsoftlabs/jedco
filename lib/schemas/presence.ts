import { z } from "zod";

// Pointage du jour, par le technicien lui-même — pas de champ technicienId
// dans le corps de la requête, il vient toujours de la session (voir la
// route), pour qu'un technicien ne puisse jamais pointer à la place d'un
// collègue.
export const pointerPresenceSchema = z.object({
  present: z.boolean().default(true),
  notes: z.string().trim().max(300).optional(),
});

export const listePresencesSchema = z.object({
  // @db.Date côté Prisma — une chaîne "YYYY-MM-DD", jamais une date-heure.
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
    .optional(),
  technicienId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PointerPresenceInput = z.infer<typeof pointerPresenceSchema>;
export type ListePresencesParams = z.infer<typeof listePresencesSchema>;
