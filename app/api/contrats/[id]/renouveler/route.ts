import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { renouvelerContrat } from "@/lib/services/contrats";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const contrat = await renouvelerContrat(id);
  if (!contrat) return reponseErreur("Contrat introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "contrat.renouvele",
    entityType: "Contrat",
    entityId: contrat.id,
    metadata: { nouvelleDateFin: contrat.dateFin.toISOString() },
  });

  return reponseOk(contrat, { message: "Contrat renouvelé" });
});
