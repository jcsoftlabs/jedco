import { describe, expect, it } from "vitest";
import {
  additionner,
  centimesEnUSDAvecTauxFige,
  centimesToHTG,
  decoderTaux,
  encoderTaux,
  formatHTG,
  htgToCentimes,
  serialiserPourJSON,
  soustraire,
} from "../money";

describe("conversion HTG <-> centimes", () => {
  it("fait un aller-retour exact", () => {
    expect(centimesToHTG(htgToCentimes(25000))).toBe(25000);
  });

  it("évite les erreurs d'arrondi flottant classiques (0.1 + 0.2)", () => {
    const a = htgToCentimes(10.1);
    const b = htgToCentimes(20.2);
    expect(centimesToHTG(additionner(a, b))).toBe(30.3);
  });

  it("dépasse largement le plafond d'un INTEGER Postgres (§1.7)", () => {
    // ~21 474 836 HTG est le plafond d'un INTEGER en centimes (2^31-1).
    // Un contrat municipal pluriannuel doit pouvoir dépasser cette valeur.
    const grosContrat = htgToCentimes(500_000_000); // 500M HTG
    expect(grosContrat).toBeGreaterThan(2_147_483_647n);
    expect(centimesToHTG(grosContrat)).toBe(500_000_000);
  });
});

describe("formatHTG", () => {
  it("formate avec deux décimales et le suffixe HTG", () => {
    expect(formatHTG(htgToCentimes(25000))).toBe("25 000,00 HTG");
  });
});

describe("additionner / soustraire", () => {
  it("additionne plusieurs montants BigInt", () => {
    expect(additionner(100n, 200n, 300n)).toBe(600n);
  });

  it("soustrait deux montants", () => {
    expect(soustraire(1000n, 400n)).toBe(600n);
  });
});

describe("taux de change figé (§1.11)", () => {
  it("encode puis décode sans perte significative", () => {
    const taux = 132.5;
    expect(decoderTaux(encoderTaux(taux))).toBeCloseTo(taux, 4);
  });

  it("calcule un montant USD à partir d'un taux figé, indépendamment du taux courant", () => {
    const montant = htgToCentimes(1325); // 1325 HTG
    const tauxFigeAuMomentEmission = encoderTaux(132.5);
    // Même si le taux courant a changé depuis, le calcul utilise le taux figé.
    expect(centimesEnUSDAvecTauxFige(montant, tauxFigeAuMomentEmission)).toBeCloseTo(10, 4);
  });
});

describe("serialiserPourJSON", () => {
  it("convertit les BigInt en string pour permettre JSON.stringify", () => {
    const payload = { montantHTG: 2_500_000n, label: "test" };
    expect(() => JSON.stringify(payload)).toThrow();
    const serialise = serialiserPourJSON(payload);
    expect(serialise).toEqual({ montantHTG: "2500000", label: "test" });
    expect(() => JSON.stringify(serialise)).not.toThrow();
  });
});
