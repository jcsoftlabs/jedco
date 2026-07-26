import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listerConversationsEnAttente, listerConversationsAgent } from "@/lib/services/conversations";

export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN", "SUPPORT"]);

  const [enAttente, mesConversations] = await Promise.all([
    listerConversationsEnAttente(),
    listerConversationsAgent(user.id),
  ]);

  return reponseOk({ enAttente, mesConversations });
});
