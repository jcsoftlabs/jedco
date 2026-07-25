import { NextRequest } from "next/server";
import { obtenirTokenSession, effacerCookieSession } from "@/lib/auth/cookies";
import { validerSession, revoquerSession } from "@/lib/auth/session";
import { reponseOk } from "@/lib/api/response";
import { consignerAudit } from "@/lib/audit";
import { routeApi } from "@/lib/api/error-handler";

export const POST = routeApi(async (_req: NextRequest) => {
  const token = await obtenirTokenSession();
  const session = await validerSession(token);

  await revoquerSession(token);
  await effacerCookieSession();

  if (session) {
    await consignerAudit({
      userId: session.userId,
      action: "auth.logout",
      entityType: "User",
      entityId: session.userId,
    });
  }

  return reponseOk(null, { message: "Déconnecté" });
});
