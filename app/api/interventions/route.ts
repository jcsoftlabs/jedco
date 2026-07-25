import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeInterventionsSchema, creerInterventionSchema } from "@/lib/schemas/interventions";
import { listerInterventions, creerIntervention } from "@/lib/services/interventions";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const params = listeInterventionsSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerInterventions(params, user);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerInterventionSchema.parse(await req.json());
  const intervention = await creerIntervention(body);

  await consignerAudit({
    userId: user!.id,
    action: "intervention.cree",
    entityType: "Intervention",
    entityId: intervention.id,
  });

  return reponseOk(intervention, { status: 201, message: "Intervention créée" });
});
