import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { demanderCodeSchema } from "@/lib/schemas/auth-client";
import { demanderCodeConnexion } from "@/lib/services/auth-client";

// Message générique volontairement identique que l'e-mail corresponde ou non
// à un client — voir lib/services/auth-client.ts pour la protection contre
// l'énumération.
export const POST = routeApi(async (req) => {
  const { email } = demanderCodeSchema.parse(await req.json());
  await demanderCodeConnexion(email);
  return reponseOk(null, {
    message: "Si cet e-mail correspond à un compte client, un code de connexion vient d'être envoyé.",
  });
});
