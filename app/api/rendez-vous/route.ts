import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listeRendezVousSchema } from "@/lib/schemas/rendez-vous";
import { listerRendezVous } from "@/lib/services/rendez-vous";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeRendezVousSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerRendezVous(params);
  return reponseOk(data, { meta });
});
