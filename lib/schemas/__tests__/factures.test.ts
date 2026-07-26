import { describe, expect, it } from "vitest";
import { modifierFactureSchema } from "../factures";

describe("modifierFactureSchema", () => {
  it("accepte les champs simples sans lignes ni taux", () => {
    const r = modifierFactureSchema.safeParse({ notes: "x" });
    expect(r.success).toBe(true);
  });

  it("accepte lignes et tauxTaxePourcent ensemble", () => {
    const r = modifierFactureSchema.safeParse({
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 100 }],
      tauxTaxePourcent: 10,
    });
    expect(r.success).toBe(true);
  });

  it("refuse lignes sans tauxTaxePourcent — un taux implicite serait une erreur silencieuse", () => {
    const r = modifierFactureSchema.safeParse({
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 100 }],
    });
    expect(r.success).toBe(false);
  });

  it("refuse tauxTaxePourcent sans lignes", () => {
    const r = modifierFactureSchema.safeParse({ tauxTaxePourcent: 10 });
    expect(r.success).toBe(false);
  });
});
