import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifierMotDePasse } from "@/lib/auth/password";
import { creerSession } from "@/lib/auth/session";
import { definirCookieSession } from "@/lib/auth/cookies";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { consignerAudit } from "@/lib/audit";
import { routeApi } from "@/lib/api/error-handler";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const POST = routeApi(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return reponseErreur("Requête invalide", { status: 400, details: z.flattenError(parsed.error) });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  // Message identique que l'email n'existe pas ou que le mot de passe soit
  // faux — ne pas révéler quel champ est incorrect.
  if (!user || !user.actif) {
    return reponseErreur("Identifiants invalides", { status: 401 });
  }

  const motDePasseValide = await verifierMotDePasse(user.passwordHash, parsed.data.password);
  if (!motDePasseValide) {
    return reponseErreur("Identifiants invalides", { status: 401 });
  }

  const token = await creerSession(user.id, {
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for"),
  });
  await definirCookieSession(token);

  await consignerAudit({
    userId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
  });

  const { passwordHash: _passwordHash, ...profil } = user;
  return reponseOk(profil);
});
