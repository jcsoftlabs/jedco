import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { prendreEnCharge } from "@/lib/services/conversations";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN", "SUPPORT"]);

  const { id } = await params;
  const conversation = await prendreEnCharge(id, user.id);
  if (!conversation) return reponseErreur("Conversation introuvable", { status: 404 });

  return reponseOk(conversation, { message: "Conversation prise en charge" });
});
