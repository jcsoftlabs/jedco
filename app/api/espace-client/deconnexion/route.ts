import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { obtenirTokenSessionClient, effacerCookieSessionClient } from "@/lib/auth/cookies";
import { revoquerSessionClient } from "@/lib/auth/session-client";

export const POST = routeApi(async () => {
  const token = await obtenirTokenSessionClient();
  await revoquerSessionClient(token);
  await effacerCookieSessionClient();
  return reponseOk(null, { message: "Déconnecté" });
});
