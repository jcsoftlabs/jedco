import { describe, expect, it } from "vitest";
import { debutJourLocal, finJourLocal, memeJourLocal, plageAujourdhui } from "../dates";

// Le fuseau America/Port-au-Prince est à GMT-4 en juillet 2026 (GMT-5 en
// hiver) — vérifié empiriquement via Intl, ne pas supposer un décalage fixe.

describe("debutJourLocal — le bug §1.14", () => {
  it("place une intervention de soirée sur le bon jour local, pas le jour UTC", () => {
    // 2026-07-25T02:00:00Z correspond à 2026-07-24T22:00 heure de Port-au-Prince
    // (GMT-4 en juillet). Un calcul naïf en UTC dirait "25 juillet" ; le jour
    // local correct est le 24 juillet.
    const instant = new Date("2026-07-25T02:00:00Z");
    const debut = debutJourLocal(instant);

    // Minuit le 24 juillet à Port-au-Prince = 04:00 UTC le 24 juillet.
    expect(debut.toISOString()).toBe("2026-07-24T04:00:00.000Z");
  });

  it("une intervention à 01h00 heure locale tombe bien le jour suivant", () => {
    const instant = new Date("2026-07-25T05:00:00Z"); // 01:00 locale le 25
    const debut = debutJourLocal(instant);
    expect(debut.toISOString()).toBe("2026-07-25T04:00:00.000Z");
  });
});

describe("finJourLocal", () => {
  it("se termine juste avant minuit local, pas minuit UTC", () => {
    const instant = new Date("2026-07-24T12:00:00Z"); // 08:00 locale le 24
    const fin = finJourLocal(instant);
    // 23:59:59.999 le 24 juillet local = 03:59:59.999 UTC le 25 juillet (GMT-4)
    expect(fin.toISOString()).toBe("2026-07-25T03:59:59.999Z");
  });
});

describe("plageAujourdhui", () => {
  it("produit une plage [début, fin] cohérente pour un instant donné", () => {
    const maintenant = new Date("2026-07-24T18:00:00Z"); // 14:00 locale
    const { debut, fin } = plageAujourdhui(undefined, maintenant);
    expect(debut.toISOString()).toBe("2026-07-24T04:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-07-25T03:59:59.999Z");
  });
});

describe("memeJourLocal", () => {
  it("considère deux instants du même jour local comme identiques malgré des dates UTC différentes", () => {
    const soir = new Date("2026-07-25T02:00:00Z"); // 24 juillet 22:00 locale
    const matin = new Date("2026-07-24T13:00:00Z"); // 24 juillet 09:00 locale
    expect(memeJourLocal(soir, matin)).toBe(true);
  });

  it("distingue deux jours locaux différents", () => {
    const jour1 = new Date("2026-07-24T13:00:00Z");
    const jour2 = new Date("2026-07-25T13:00:00Z");
    expect(memeJourLocal(jour1, jour2)).toBe(false);
  });
});
