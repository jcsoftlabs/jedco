import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { rapportExecutionSchema } from "@/lib/schemas/interventions";
import { ajouterRapportExecution } from "@/lib/services/interventions";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const { id } = await params;
  const body = rapportExecutionSchema.parse(await req.json());
  const intervention = await ajouterRapportExecution(id, body, user);
  if (!intervention) return reponseErreur("Intervention introuvable", { status: 404 });

  await consignerAudit({
    userId: user.id,
    action: "intervention.rapport_ajoute",
    entityType: "Intervention",
    entityId: id,
    metadata: { nombrePhotos: body.photos.length },
  });

  return reponseOk(intervention, { message: "Rapport enregistré" });
});
