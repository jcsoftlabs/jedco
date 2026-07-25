import { describe, expect, it, vi } from "vitest";

// lib/env.ts valide process.env au moment de l'import et lève une exception
// si une variable est manquante ou invalide (§0 — "refuse de démarrer").
// On doit donc réinitialiser le registre de modules entre chaque scénario
// pour forcer une réévaluation du module avec un process.env différent.
describe("validation des variables d'environnement", () => {
  const base = {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    SESSION_SECRET: "a".repeat(32),
  };

  it("accepte un environnement valide", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", base.NODE_ENV);
    vi.stubEnv("DATABASE_URL", base.DATABASE_URL);
    vi.stubEnv("SESSION_SECRET", base.SESSION_SECRET);
    vi.stubEnv("DIRECT_URL", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");

    const { env } = await import("../env");
    expect(env.DATABASE_URL).toBe(base.DATABASE_URL);

    vi.unstubAllEnvs();
  });

  it("refuse de démarrer sans DATABASE_URL", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SESSION_SECRET", base.SESSION_SECRET);

    await expect(import("../env")).rejects.toThrow(/DATABASE_URL/);

    vi.unstubAllEnvs();
  });

  it("refuse un SESSION_SECRET trop court", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", base.DATABASE_URL);
    vi.stubEnv("SESSION_SECRET", "trop-court");

    await expect(import("../env")).rejects.toThrow(/SESSION_SECRET/);

    vi.unstubAllEnvs();
  });
});
