import { obtenirTokenSession } from "@/lib/auth/cookies";
import { validerSession } from "@/lib/auth/session";

// Compose cookie + validation de session pour les Server Components et les
// Route Handlers. Retourne `null` si aucune session valide n'est présente
// (absente, expirée, ou révoquée par une déconnexion antérieure).
export async function utilisateurCourant() {
  const token = await obtenirTokenSession();
  const session = await validerSession(token);
  return session?.user ?? null;
}
