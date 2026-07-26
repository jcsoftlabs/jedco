import { cookies } from "next/headers";
import { DUREE_SESSION_MS } from "@/lib/auth/session";
import { DUREE_SESSION_CLIENT_MS } from "@/lib/auth/session-client";

export const NOM_COOKIE_SESSION = "jedco_session";

export async function definirCookieSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(NOM_COOKIE_SESSION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(DUREE_SESSION_MS / 1000),
  });
}

export async function effacerCookieSession(): Promise<void> {
  const store = await cookies();
  store.delete(NOM_COOKIE_SESSION);
}

export async function obtenirTokenSession(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(NOM_COOKIE_SESSION)?.value;
}

// Cookie distinct du personnel (NOM_COOKIE_SESSION) — un nom de cookie séparé
// évite qu'un même navigateur utilisé à la fois par un employé et un client
// (poste partagé) ne mélange les deux périmètres.
export const NOM_COOKIE_SESSION_CLIENT = "jedco_session_client";

export async function definirCookieSessionClient(token: string): Promise<void> {
  const store = await cookies();
  store.set(NOM_COOKIE_SESSION_CLIENT, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(DUREE_SESSION_CLIENT_MS / 1000),
  });
}

export async function effacerCookieSessionClient(): Promise<void> {
  const store = await cookies();
  store.delete(NOM_COOKIE_SESSION_CLIENT);
}

export async function obtenirTokenSessionClient(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(NOM_COOKIE_SESSION_CLIENT)?.value;
}
