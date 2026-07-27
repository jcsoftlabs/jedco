import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { presenceDuJour } from "@/lib/services/presence";

// Ce que le technicien voit de sa propre journée — a-t-il déjà pointé
// aujourd'hui, et sous quel statut. Distinct de GET /api/presences (réservé
// ADMIN/SUPERVISEUR) : un technicien n'a besoin de voir que la sienne.
export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });
  if (!user.technicien) {
    return reponseErreur("Seul un compte technicien a une présence à consulter", { status: 403 });
  }

  const presence = await presenceDuJour(user.technicien.id);
  return reponseOk(presence);
});
