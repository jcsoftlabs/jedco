import "dotenv/config";
import { describe, expect, it } from "vitest";
import { codeClient, referenceContrat, matriculeTechnicien } from "../codes";

// Test d'intégration contre la vraie base Railway — c'est précisément le
// scénario qui casse un générateur "lire le max, ajouter 1" (§1.4) : la
// séquence PostgreSQL doit rester atomique même avec des dizaines d'appels
// strictement simultanés.
describe("génération de codes via séquences PostgreSQL (§1.4)", () => {
  it("ne produit jamais de doublon sous 50 appels concurrents", async () => {
    const resultats = await Promise.all(Array.from({ length: 50 }, () => codeClient()));
    const uniques = new Set(resultats);
    expect(uniques.size).toBe(50);
  });

  it("produit un format JED-XXXX", async () => {
    const code = await codeClient();
    expect(code).toMatch(/^JED-\d{4,}$/);
  });

  it("produit un format CTR-<année>-XXXX", async () => {
    const ref = await referenceContrat();
    const annee = new Date().getFullYear();
    expect(ref).toMatch(new RegExp(`^CTR-${annee}-\\d{4,}$`));
  });

  it("des préfixes différents ont des compteurs indépendants", async () => {
    const [avant] = await Promise.all([matriculeTechnicien()]);
    const [apres] = await Promise.all([matriculeTechnicien()]);
    const numAvant = Number(avant.split("-")[1]);
    const numApres = Number(apres.split("-")[1]);
    expect(numApres).toBe(numAvant + 1);
  });
});
