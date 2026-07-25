import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("cleMediaIntervention", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("namespace la clé par intervention et préserve une extension autorisée", async () => {
    const { cleMediaIntervention } = await import("../r2");
    const cle = cleMediaIntervention("int_123", "photo.JPG");
    expect(cle).toMatch(/^interventions\/int_123\/[0-9a-f-]+\.jpg$/);
  });

  it("retombe sur .jpg pour une extension non reconnue", async () => {
    const { cleMediaIntervention } = await import("../r2");
    const cle = cleMediaIntervention("int_123", "fichier.exe");
    expect(cle.endsWith(".jpg")).toBe(true);
  });
});

describe("configuration R2 manquante", () => {
  beforeEach(() => {
    vi.resetModules();
    // lib/env.ts valide DATABASE_URL/SESSION_SECRET au chargement quel que
    // soit l'état ambiant du process — on les fixe explicitement pour ne pas
    // dépendre de l'ordre d'exécution des autres fichiers de test.
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_BUCKET_NAME", "");
    vi.stubEnv("R2_PUBLIC_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("échoue explicitement à l'usage plutôt que silencieusement", async () => {
    const { creerUrlUploadPresignee } = await import("../r2");
    await expect(creerUrlUploadPresignee("interventions/x/y.jpg", "image/jpeg")).rejects.toThrow(
      /R2_ACCOUNT_ID/
    );
  });
});

describe("cleDepuisUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("SESSION_SECRET", "a".repeat(32));
    vi.stubEnv("R2_ACCOUNT_ID", "acc");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET_NAME", "jedco-media");
    vi.stubEnv("R2_PUBLIC_URL", "https://media.jedco.ht");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("extrait la clé depuis une URL publique du bucket configuré", async () => {
    const { cleDepuisUrl } = await import("../r2");
    expect(cleDepuisUrl("https://media.jedco.ht/interventions/int_1/abc.jpg")).toBe(
      "interventions/int_1/abc.jpg"
    );
  });

  it("rejette une URL hors du bucket configuré", async () => {
    const { cleDepuisUrl } = await import("../r2");
    expect(() => cleDepuisUrl("https://autre-domaine.com/x.jpg")).toThrow(/hors du bucket/);
  });
});
