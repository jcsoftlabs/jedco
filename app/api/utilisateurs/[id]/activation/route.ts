import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { activationCompteSchema } from "@/lib/schemas/utilisateurs";
import { definirActivationCompte } from "@/lib/services/utilisateurs";
import { consignerAudit } from "@/lib/audit";

// Activation / désactivation d'un compte — le geste à faire quand un employé
// quitte l'entreprise, plutôt que de supprimer le compte (ce qui effacerait
// son historique dans le journal d'audit).
export const POST = routeApi<{ params: Promise<{ id: string }> }>(async (req: NextRequest, ctx) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const { id } = await ctx.params;
  // Se désactiver soi-même verrouille le backoffice sans personne pour le
  // rouvrir : il faudrait une intervention en base. On refuse.
  if (id === user!.id) {
    return reponseErreur("Vous ne pouvez pas désactiver votre propre compte", { status: 400 });
  }

  const { actif } = activationCompteSchema.parse(await req.json());
  const cible = await definirActivationCompte(id, actif);

  await consignerAudit({
    userId: user!.id,
    action: actif ? "utilisateur.reactive" : "utilisateur.desactive",
    entityType: "User",
    entityId: id,
    metadata: { email: cible.email },
  });

  return reponseOk(cible, { message: actif ? "Compte réactivé" : "Compte désactivé" });
});
