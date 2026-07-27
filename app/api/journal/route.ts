import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listeAuditSchema } from "@/lib/schemas/audit";
import { listerJournalAudit } from "@/lib/audit";

// Réservé à ADMIN : le journal trace aussi les connexions, réinitialisations
// de mot de passe et changements de rôle — un SUPERVISEUR n'a pas à voir qui
// a fait quoi sur les comptes des autres.
export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const params = listeAuditSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerJournalAudit(params);
  return reponseOk(data, { meta });
});
