import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listerUtilisateurs } from "@/lib/services/utilisateurs";

// Réservé à ADMIN : la liste des comptes est aussi la liste des cibles de
// réinitialisation. Un SUPERVISEUR gère le métier, pas les accès.
export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  return reponseOk(await listerUtilisateurs());
});
