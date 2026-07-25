import { NextRequest } from "next/server";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { routeApi } from "@/lib/api/error-handler";

export const GET = routeApi(async (_req: NextRequest) => {
  const user = await utilisateurCourant();
  if (!user) {
    return reponseErreur("Non authentifié", { status: 401 });
  }
  const { passwordHash: _passwordHash, ...profil } = user;
  return reponseOk(profil);
});
