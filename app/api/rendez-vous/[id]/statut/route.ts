import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { changerStatutRendezVousSchema } from "@/lib/schemas/rendez-vous";
import { changerStatutRendezVous } from "@/lib/services/rendez-vous";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const { statut } = changerStatutRendezVousSchema.parse(await req.json());
  const rdv = await changerStatutRendezVous(id, statut);
  if (!rdv) return reponseErreur("Rendez-vous introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "rendez-vous.statut-modifie",
    entityType: "RendezVous",
    entityId: id,
    metadata: { statut },
  });

  return reponseOk(rdv, { message: "Statut mis à jour" });
});
