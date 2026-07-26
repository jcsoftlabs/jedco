import { obtenirTokenSessionClient } from "@/lib/auth/cookies";
import { validerSessionClient } from "@/lib/auth/session-client";

// Équivalent de utilisateurCourant() (lib/auth/current-user.ts) pour le
// portail client. Retourne `null` si aucune session client valide.
export async function clientCourant() {
  const token = await obtenirTokenSessionClient();
  const session = await validerSessionClient(token);
  return session?.client ?? null;
}
