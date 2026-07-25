import { describe, expect, it } from "vitest";
import { transitionValide } from "../statut";

describe("machine à états des interventions", () => {
  it("autorise le chemin nominal complet", () => {
    expect(transitionValide("EN_ATTENTE", "PLANIFIE")).toBe(true);
    expect(transitionValide("PLANIFIE", "EN_COURS")).toBe(true);
    expect(transitionValide("EN_COURS", "COMPLETE")).toBe(true);
  });

  it("autorise l'annulation depuis les trois statuts actifs", () => {
    expect(transitionValide("EN_ATTENTE", "ANNULE")).toBe(true);
    expect(transitionValide("PLANIFIE", "ANNULE")).toBe(true);
    expect(transitionValide("EN_COURS", "ANNULE")).toBe(true);
  });

  it("refuse de sauter une étape", () => {
    expect(transitionValide("EN_ATTENTE", "EN_COURS")).toBe(false);
    expect(transitionValide("EN_ATTENTE", "COMPLETE")).toBe(false);
    expect(transitionValide("PLANIFIE", "COMPLETE")).toBe(false);
  });

  it("refuse de revenir en arrière", () => {
    expect(transitionValide("EN_COURS", "PLANIFIE")).toBe(false);
    expect(transitionValide("COMPLETE", "EN_COURS")).toBe(false);
  });

  it("COMPLETE et ANNULE sont des états terminaux", () => {
    expect(transitionValide("COMPLETE", "ANNULE")).toBe(false);
    expect(transitionValide("ANNULE", "PLANIFIE")).toBe(false);
    expect(transitionValide("COMPLETE", "COMPLETE")).toBe(false);
  });
});
