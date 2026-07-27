import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { ErreurAcces } from "@/lib/auth/rbac";
import { creerSession } from "@/lib/auth/session";
import { definirCookieSession } from "@/lib/auth/cookies";
import { changerMotDePasseSchema } from "@/lib/schemas/utilisateurs";
import { changerSonMotDePasse } from "@/lib/services/utilisateurs";
import { consignerAudit } from "@/lib/audit";

// Changement de son propre mot de passe — ouvert à TOUS les rôles, y compris
// TECHNICIEN et SUPPORT : c'est précisément eux qui reçoivent un mot de passe
// choisi par l'administrateur au moment de la création de leur compte.
export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  if (!user) throw new ErreurAcces("Session expirée");

  const { actuel, nouveau } = changerMotDePasseSchema.parse(await req.json());
  await changerSonMotDePasse(user.id, actuel, nouveau);

  // changerSonMotDePasse a révoqué toutes les sessions, y compris celle qui
  // porte cette requête. Sans ce nouveau cookie, l'utilisateur serait éjecté
  // vers l'écran de connexion juste après avoir changé son mot de passe — un
  // comportement qui ressemble à une erreur.
  const token = await creerSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for"),
  });
  await definirCookieSession(token);

  await consignerAudit({
    userId: user.id,
    action: "auth.mot-de-passe-change",
    entityType: "User",
    entityId: user.id,
  });

  return reponseOk(
    { id: user.id },
    { message: "Mot de passe modifié. Vos autres appareils ont été déconnectés." }
  );
});
