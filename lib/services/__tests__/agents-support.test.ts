import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { creerAgentSupport, listerAgentsSupport, desactiverAgentSupport } from "../agents-support";

describe("module Agents support (intégration réelle)", () => {
  const idsCrees: string[] = [];

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: idsCrees } } });
    await prisma.$disconnect();
  });

  it("crée un compte SUPPORT avec mot de passe haché, sans fiche métier associée", async () => {
    const email = `test-agent-${Date.now()}@jedco.test`;
    const agent = await creerAgentSupport({
      email,
      motDePasse: "motdepasse123",
      nom: "Agent",
      prenom: "Test",
    });
    idsCrees.push(agent.id);

    expect(agent.role).toBe("SUPPORT");
    expect(agent.actif).toBe(true);
    expect(agent.passwordHash).not.toBe("motdepasse123");

    const listes = await listerAgentsSupport();
    expect(listes.some((a) => a.id === agent.id)).toBe(true);
  });

  it("refuse un e-mail déjà utilisé", async () => {
    const email = `test-agent-dup-${Date.now()}@jedco.test`;
    const agent = await creerAgentSupport({ email, motDePasse: "motdepasse123", nom: "A", prenom: "B" });
    idsCrees.push(agent.id);

    await expect(
      creerAgentSupport({ email, motDePasse: "autremotdepasse", nom: "C", prenom: "D" })
    ).rejects.toThrow(ErreurMetier);
  });

  it("désactiverAgentSupport bascule l'état actif, ignore un id qui n'est pas SUPPORT", async () => {
    const agent = await creerAgentSupport({
      email: `test-agent-toggle-${Date.now()}@jedco.test`,
      motDePasse: "motdepasse123",
      nom: "Toggle",
      prenom: "Test",
    });
    idsCrees.push(agent.id);

    const desactive = await desactiverAgentSupport(agent.id);
    expect(desactive?.actif).toBe(false);

    const reactive = await desactiverAgentSupport(agent.id);
    expect(reactive?.actif).toBe(true);

    const admin = await prisma.user.create({
      data: { email: `test-admin-${Date.now()}@jedco.test`, passwordHash: "x", nom: "A", prenom: "A", role: "ADMIN" },
    });
    idsCrees.push(admin.id);
    expect(await desactiverAgentSupport(admin.id)).toBeNull();
  });
});
