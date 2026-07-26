import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

// Sessions du portail client — même principe que lib/auth/session.ts (opaques,
// révocables, hash seul en base) mais un modèle distinct : un Client n'est
// pas un User, et une compromission de l'un ne doit pas ouvrir l'accès à
// l'autre périmètre.
export const DUREE_SESSION_CLIENT_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours — portail en lecture seule, faible enjeu

function genererToken(): string {
  return randomBytes(32).toString("base64url");
}

function hacherToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type MetaSessionClient = {
  userAgent?: string | null;
  ipAddress?: string | null;
};

export async function creerSessionClient(clientId: string, meta: MetaSessionClient = {}): Promise<string> {
  const token = genererToken();
  await prisma.sessionClient.create({
    data: {
      clientId,
      tokenHash: hacherToken(token),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: new Date(Date.now() + DUREE_SESSION_CLIENT_MS),
    },
  });
  return token;
}

export async function validerSessionClient(token: string | undefined | null) {
  if (!token) return null;

  const session = await prisma.sessionClient.findUnique({
    where: { tokenHash: hacherToken(token) },
    include: { client: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.client.actif || session.client.deletedAt) return null;

  return session;
}

export async function revoquerSessionClient(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.sessionClient.updateMany({
    where: { tokenHash: hacherToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
