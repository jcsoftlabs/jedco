import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { planningDuJour } from "@/lib/services/interventions";

type Ctx = { params: Promise<{ date: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { date } = await params;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return reponseErreur("Date invalide (attendu AAAA-MM-JJ)", { status: 400 });
  }

  const planning = await planningDuJour(parsed);
  return reponseOk(planning);
});
