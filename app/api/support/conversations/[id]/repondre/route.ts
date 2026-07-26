import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { repondreConversationSchema } from "@/lib/schemas/conversations";
import { repondreConversation } from "@/lib/services/conversations";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN", "SUPPORT"]);

  const { id } = await params;
  const { contenu } = repondreConversationSchema.parse(await req.json());
  const conversation = await repondreConversation(id, user.id, contenu);
  if (!conversation) return reponseErreur("Conversation introuvable", { status: 404 });

  return reponseOk(conversation);
});
