import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listerPaiementsFacture } from "@/lib/services/paiements";

type Ctx = { params: Promise<{ factureId: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { factureId } = await params;
  const paiements = await listerPaiementsFacture(factureId);
  return reponseOk(paiements);
});
