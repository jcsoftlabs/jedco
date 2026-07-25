import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { creerSession, validerSession, revoquerSession, revoquerToutesLesSessions } from "../session";
import { hasherMotDePasse } from "../password";

// Test d'intégration contre la vraie base Railway (pas de mock) — on crée un
// utilisateur jetable et on le supprime à la fin, y compris en cas d'échec.
describe("sessions révocables (§1.6)", () => {
  let userId: string;

  beforeAll(async () => {
    const passwordHash = await hasherMotDePasse("Test1234!");
    const user = await prisma.user.create({
      data: {
        email: `test-session-${Date.now()}@jedco.test`,
        passwordHash,
        nom: "Test",
        prenom: "Session",
        role: "ADMIN",
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("valide une session fraîchement créée", async () => {
    const token = await creerSession(userId);
    const session = await validerSession(token);
    expect(session?.userId).toBe(userId);
  });

  it("refuse un token inconnu", async () => {
    const session = await validerSession("token-qui-nexiste-pas");
    expect(session).toBeNull();
  });

  it("refuse un token absent", async () => {
    expect(await validerSession(undefined)).toBeNull();
    expect(await validerSession(null)).toBeNull();
  });

  it("la déconnexion révoque réellement la session — corrige le bug §1.6", async () => {
    const token = await creerSession(userId);
    expect(await validerSession(token)).not.toBeNull();

    await revoquerSession(token);

    // C'est précisément le bug corrigé : sans révocation en base, ce second
    // appel validerait encore le token comme s'il n'y avait jamais eu de
    // déconnexion.
    expect(await validerSession(token)).toBeNull();
  });

  it("revoquerToutesLesSessions invalide toutes les sessions actives d'un utilisateur", async () => {
    const tokenA = await creerSession(userId);
    const tokenB = await creerSession(userId);

    await revoquerToutesLesSessions(userId);

    expect(await validerSession(tokenA)).toBeNull();
    expect(await validerSession(tokenB)).toBeNull();
  });

  it("ne stocke jamais le token brut en base, seulement son hash", async () => {
    const token = await creerSession(userId);
    const enBase = await prisma.session.findMany({ where: { userId } });
    for (const s of enBase) {
      expect(s.tokenHash).not.toBe(token);
    }
  });
});
