import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { changerStatutSchema } from "@/lib/schemas/interventions";
import { changerStatutIntervention } from "@/lib/services/interventions";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const { id } = await params;
  const { statut } = changerStatutSchema.parse(await req.json());
  const resultat = await changerStatutIntervention(id, statut, user);
  if (!resultat) return reponseErreur("Intervention introuvable", { status: 404 });

  await consignerAudit({
    userId: user.id,
    action: "intervention.statut_change",
    entityType: "Intervention",
    entityId: id,
    metadata: { nouveauStatut: statut },
  });

  return reponseOk(
    { ...resultat.intervention, factureProposee: resultat.factureProposee },
    { message: "Statut mis à jour" }
  );
});
