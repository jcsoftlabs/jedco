import { NextRequest } from "next/server";
import { z } from "zod";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { statsFactures } from "@/lib/services/factures";

const schema = z.object({
  dateDebut: z.coerce.date().optional(),
  dateFin: z.coerce.date().optional(),
});

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const stats = await statsFactures(params);
  return reponseOk(stats);
});
