import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerAgentSupportSchema } from "@/lib/schemas/agents-support";
import { creerAgentSupport, listerAgentsSupport } from "@/lib/services/agents-support";
import { consignerAudit } from "@/lib/audit";

// Gestion des comptes support réservée à ADMIN — un agent SUPPORT ne doit
// jamais pouvoir créer d'autres comptes, même dans son propre périmètre.
export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN"]);

  const agents = await listerAgentsSupport();
  return reponseOk(agents.map((a) => ({ id: a.id, email: a.email, nom: a.nom, prenom: a.prenom, actif: a.actif })));
});

export const POST = routeApi(async (req) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non connecté", { status: 401 });
  requireRole(user, ["ADMIN"]);

  const body = creerAgentSupportSchema.parse(await req.json());
  const agent = await creerAgentSupport(body);

  await consignerAudit({
    userId: user.id,
    action: "agent_support.cree",
    entityType: "User",
    entityId: agent.id,
  });

  return reponseOk(
    { id: agent.id, email: agent.email, nom: agent.nom, prenom: agent.prenom },
    { status: 201, message: "Agent support créé" }
  );
});
