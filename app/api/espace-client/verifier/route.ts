import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { verifierCodeSchema } from "@/lib/schemas/auth-client";
import { verifierCodeConnexion } from "@/lib/services/auth-client";
import { definirCookieSessionClient } from "@/lib/auth/cookies";

export const POST = routeApi(async (req) => {
  const { email, code } = verifierCodeSchema.parse(await req.json());

  const token = await verifierCodeConnexion(email, code, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for"),
  });

  await definirCookieSessionClient(token);
  return reponseOk(null, { message: "Connexion réussie" });
});
