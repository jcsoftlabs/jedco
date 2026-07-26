import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { desactiverAgentSupport } from "@/lib/services/agents-support";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN"]);

  const { id } = await params;
  const agent = await desactiverAgentSupport(id);
  if (!agent) return reponseErreur("Agent introuvable", { status: 404 });

  return reponseOk({ id: agent.id, actif: agent.actif });
});
