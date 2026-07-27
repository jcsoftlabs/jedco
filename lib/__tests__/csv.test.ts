import { describe, it, expect } from "vitest";
import { genererCsv } from "@/lib/csv";

describe("genererCsv", () => {
  it("échappe les champs contenant une virgule, un guillemet ou un saut de ligne", () => {
    const csv = genererCsv(
      ["Nom", "Ville"],
      [["Dupont, Jean", "Port-au-Prince"], ['Le "Boss"', "Ligne1\nLigne2"]]
    );
    expect(csv).toContain('"Dupont, Jean"');
    expect(csv).toContain('"Le ""Boss"""');
    expect(csv).toContain('"Ligne1\nLigne2"');
  });

  it("laisse les champs simples sans guillemets", () => {
    const csv = genererCsv(["A", "B"], [["simple", 42]]);
    expect(csv).toContain("simple,42");
  });

  it("commence par le BOM UTF-8", () => {
    const csv = genererCsv(["A"], [["1"]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("traite null/undefined comme une cellule vide", () => {
    const csv = genererCsv(["A", "B"], [[null, undefined]]);
    expect(csv.endsWith(",")).toBe(true);
  });
});
