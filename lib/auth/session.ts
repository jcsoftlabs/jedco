import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

// Sessions opaques révocables en base — corrige §1.6 : un JWT auto-porteur
// reste valide jusqu'à expiration même après déconnexion ou changement de mot
// de passe. Ici, "se déconnecter" révoque réellement l'accès côté serveur.
//
// Le token brut ne quitte jamais le serveur autrement que dans le cookie
// httpOnly envoyé au navigateur — seul son hash SHA-256 est stocké en base
// (Session.tokenHash), pour qu'une fuite de la base ne suffise pas à
// usurper une session active.

export const DUREE_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function genererToken(): string {
  return randomBytes(32).toString("base64url");
}

function hacherToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type MetaSession = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export async function creerSession(userId: string, meta: MetaSession = {}): Promise<string> {
  const token = genererToken();
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hacherToken(token),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + DUREE_SESSION_MS),
    },
  });
  return token;
}

export async function validerSession(token: string | undefined | null) {
  if (!token) return null;

  // La fiche Technicien est chargée avec l'utilisateur — sans elle,
  // scopeInterventions (lib/auth/rbac.ts) trouve `user.technicien` toujours
  // indéfini et traite tout compte TECHNICIEN comme n'ayant aucune fiche
  // liée, renvoyant `{ id: "__aucun__" }` : zéro intervention, y compris
  // les siennes. Bug réel constaté en base — un technicien connecté ne
  // voyait rien du tout sur la page Terrain.
  const session = await prisma.session.findUnique({
    where: { tokenHash: hacherToken(token) },
    include: { user: { include: { technicien: { select: { id: true } } } } },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.actif) return null;

  return session;
}

// Fenêtre glissante : tant qu'un admin utilise activement le backoffice, sa
// session ne doit jamais expirer toute seule — seule une déconnexion
// manuelle (ou une vraie inactivité de plus de DUREE_SESSION_MS) y met fin.
// Appelé périodiquement depuis le client (voir SessionKeepAlive), qui
// repousse aussi le cookie côté navigateur — sans ça, le cookie lui-même
// expirerait à sa date d'origine même si la session en base est prolongée.
export async function renouvelerSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const resultat = await prisma.session.updateMany({
    where: { tokenHash: hacherToken(token), revokedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date(Date.now() + DUREE_SESSION_MS) },
  });
  return resultat.count > 0;
}

export async function revoquerSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  // updateMany plutôt que update : ne lève pas si le token n'existe déjà plus
  // (double clic sur déconnexion, token déjà expiré).
  await prisma.session.updateMany({
    where: { tokenHash: hacherToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Utile lors d'un changement de mot de passe : invalide toutes les sessions
// actives de l'utilisateur, y compris sur d'autres appareils.
export async function revoquerToutesLesSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
