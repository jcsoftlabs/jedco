import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { statsFlotte } from "@/lib/services/vehicules";

// Endpoint léger, dédié à la cloche de notifications : statsFlotte() charge
// aussi les compteurs par statut et le coût cumulé d'entretien, inutiles ici
// et coûteux à recalculer toutes les 45 secondes depuis le client. On
// n'expose que la liste dont la cloche a besoin.
export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { entretiensDus } = await statsFlotte();
  return reponseOk(entretiensDus);
});
