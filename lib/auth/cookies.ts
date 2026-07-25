import { cookies } from "next/headers";
import { DUREE_SESSION_MS } from "@/lib/auth/session";

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
