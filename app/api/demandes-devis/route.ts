import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeDemandesDevisSchema } from "@/lib/schemas/demandes-devis";
import { listerDemandesDevis } from "@/lib/services/demandes-devis";

export const GET = routeApi(async (req) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeDemandesDevisSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerDemandesDevis(params);
  return reponseOk(data, { meta });
});
