import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { envoyerDevisParEmail } from "@/lib/services/notifications";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const devis = await envoyerDevisParEmail(id);
  if (!devis) return reponseErreur("Devis introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "devis.envoye_par_email",
    entityType: "Devis",
    entityId: id,
  });

  return reponseOk(null, { message: "Devis envoyé par e-mail" });
});
