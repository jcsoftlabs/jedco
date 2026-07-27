import { z } from "zod";

export const listeAuditSchema = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListeAuditParams = z.infer<typeof listeAuditSchema>;
