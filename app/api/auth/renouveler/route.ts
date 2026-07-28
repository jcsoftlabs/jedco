import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { obtenirTokenSession, definirCookieSession } from "@/lib/auth/cookies";
import { renouvelerSession } from "@/lib/auth/session";

// Appelé périodiquement par SessionKeepAlive tant qu'un onglet admin reste
// ouvert — prolonge la session en base ET réémet le cookie avec un maxAge
// frais (le cookie navigateur ne se prolonge pas tout seul, même si la
// session en base est renouvelée côté serveur).
export const POST = routeApi(async () => {
  const token = await obtenirTokenSession();
  if (!token) return reponseErreur("Non authentifié", { status: 401 });

  const renouvelee = await renouvelerSession(token);
  if (!renouvelee) return reponseErreur("Session expirée", { status: 401 });

  await definirCookieSession(token);
  return reponseOk(null);
});
