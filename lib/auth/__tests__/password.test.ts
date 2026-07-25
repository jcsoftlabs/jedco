import { describe, expect, it } from "vitest";
import { hasherMotDePasse, verifierMotDePasse } from "../password";

describe("hachage de mot de passe", () => {
  it("vérifie correctement un mot de passe correct", async () => {
    const hash = await hasherMotDePasse("Admin1234!");
    expect(await verifierMotDePasse(hash, "Admin1234!")).toBe(true);
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hasherMotDePasse("Admin1234!");
    expect(await verifierMotDePasse(hash, "MauvaisMotDePasse")).toBe(false);
  });

  it("ne stocke jamais le mot de passe en clair dans le hash", async () => {
    const hash = await hasherMotDePasse("Admin1234!");
    expect(hash).not.toContain("Admin1234!");
  });
});
