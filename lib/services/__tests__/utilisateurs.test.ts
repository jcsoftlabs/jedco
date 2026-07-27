import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { hasherMotDePasse, verifierMotDePasse } from "@/lib/auth/password";
import { creerSession, validerSession } from "@/lib/auth/session";
import { ErreurMetier } from "@/lib/errors";
import {
  changerSonMotDePasse,
  reinitialiserMotDePasse,
  definirActivationCompte,
  listerUtilisateurs,
} from "@/lib/services/utilisateurs";

const EMAIL = `pwd-${Date.now()}@jedco.test`;
const MOT_DE_PASSE_INITIAL = "MotDePasseInitial2026";
const NOUVEAU = "NouveauMotDePasse2026";

let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      passwordHash: await hasherMotDePasse(MOT_DE_PASSE_INITIAL),
      nom: "Test",
      prenom: "Mot de passe",
      role: "TECHNICIEN",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("changerSonMotDePasse", () => {
  it("refuse un mot de passe actuel incorrect", async () => {
    await expect(changerSonMotDePasse(userId, "mauvais", NOUVEAU)).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse de réutiliser le mot de passe actuel", async () => {
    await expect(
      changerSonMotDePasse(userId, MOT_DE_PASSE_INITIAL, MOT_DE_PASSE_INITIAL)
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("remplace le hachage et révoque les sessions ouvertes", async () => {
    // Une session active avant le changement doit être morte après : c'est
    // tout l'intérêt d'avoir des sessions révocables en base (§1.6).
    const token = await creerSession(userId);
    expect(await validerSession(token)).not.toBeNull();

    await changerSonMotDePasse(userId, MOT_DE_PASSE_INITIAL, NOUVEAU);

    expect(await validerSession(token)).toBeNull();

    const apres = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifierMotDePasse(apres.passwordHash, NOUVEAU)).toBe(true);
    expect(await verifierMotDePasse(apres.passwordHash, MOT_DE_PASSE_INITIAL)).toBe(false);
  });
});

describe("reinitialiserMotDePasse", () => {
  it("change le mot de passe sans connaître l'ancien et coupe les sessions", async () => {
    const token = await creerSession(userId);
    const cible = await reinitialiserMotDePasse(userId, "ReinitialiseParAdmin1");

    expect(cible.email).toBe(EMAIL);
    expect(await validerSession(token)).toBeNull();

    const apres = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifierMotDePasse(apres.passwordHash, "ReinitialiseParAdmin1")).toBe(true);
  });

  it("échoue explicitement sur un compte inexistant", async () => {
    await expect(reinitialiserMotDePasse("inexistant", "PeuImporteCeMotDePasse")).rejects.toBeInstanceOf(
      ErreurMetier
    );
  });
});

describe("definirActivationCompte", () => {
  it("désactive, invalide la session en cours, puis réactive", async () => {
    const token = await creerSession(userId);

    await definirActivationCompte(userId, false);
    // validerSession vérifie déjà `user.actif` — la désactivation doit donc
    // fermer l'accès immédiatement, sans attendre l'expiration du cookie.
    expect(await validerSession(token)).toBeNull();

    const reactive = await definirActivationCompte(userId, true);
    expect(reactive.actif).toBe(true);
  });
});

describe("listerUtilisateurs", () => {
  it("n'expose jamais le hachage du mot de passe", async () => {
    const utilisateurs = await listerUtilisateurs();
    const cible = utilisateurs.find((u) => u.id === userId);
    expect(cible).toBeDefined();
    expect(cible).not.toHaveProperty("passwordHash");
  });
});