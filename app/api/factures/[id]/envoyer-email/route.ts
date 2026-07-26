import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { envoyerFactureParEmail } from "@/lib/services/notifications";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const facture = await envoyerFactureParEmail(id);
  if (!facture) return reponseErreur("Facture introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "facture.envoyee_par_email",
    entityType: "Facture",
    entityId: id,
  });

  return reponseOk(null, { message: "Facture envoyée par e-mail" });
});
