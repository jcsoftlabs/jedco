import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierInterventionSchema } from "@/lib/schemas/interventions";
import { obtenirIntervention, modifierIntervention } from "@/lib/services/interventions";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const { id } = await params;
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) return reponseErreur("Intervention introuvable", { status: 404 });

  return reponseOk(intervention);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const { id } = await params;
  const body = modifierInterventionSchema.parse(await req.json());
  const intervention = await modifierIntervention(id, body, user);
  if (!intervention) return reponseErreur("Intervention introuvable", { status: 404 });

  await consignerAudit({
    userId: user.id,
    action: "intervention.modifiee",
    entityType: "Intervention",
    entityId: intervention.id,
  });

  return reponseOk(intervention, { message: "Intervention modifiée" });
});
