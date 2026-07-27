import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { creerRendezVous, listerRendezVous, changerStatutRendezVous } from "../rendez-vous";

describe("module RendezVous — formulaire public (intégration réelle)", () => {
  const idsRendezVous: string[] = [];

  afterAll(async () => {
    await prisma.rendezVous.deleteMany({ where: { id: { in: idsRendezVous } } });
    await prisma.$disconnect();
  });

  it("crée un rendez-vous EN_ATTENTE par défaut", async () => {
    const rdv = await creerRendezVous({
      nom: `Test RDV ${Date.now()}`,
      telephone: "+509 3000 0000",
      service: "VIDANGE",
      ville: "Port-au-Prince",
      dateVoulue: new Date(Date.now() + 7 * 86_400_000),
    });
    idsRendezVous.push(rdv.id);

    expect(rdv.statut).toBe("EN_ATTENTE");
    expect(rdv.service).toBe("VIDANGE");
  });

  it("accepte un rendez-vous sans e-mail, adresse ni message (tous facultatifs)", async () => {
    const rdv = await creerRendezVous({
      nom: `Test RDV Minimal ${Date.now()}`,
      telephone: "+509 4000 0000",
      service: "COLLECTE",
      ville: "Jacmel",
      dateVoulue: new Date(Date.now() + 3 * 86_400_000),
    });
    idsRendezVous.push(rdv.id);

    expect(rdv.email).toBeNull();
    expect(rdv.adresse).toBeNull();
    expect(rdv.message).toBeNull();
  });

  it("liste les rendez-vous du plus proche au plus lointain, pas du plus récemment soumis", async () => {
    const lointain = await creerRendezVous({
      nom: `Test RDV Lointain ${Date.now()}`,
      telephone: "+509 5000 0000",
      service: "NETTOYAGE",
      ville: "Cap-Haïtien",
      dateVoulue: new Date(Date.now() + 20 * 86_400_000),
    });
    idsRendezVous.push(lointain.id);

    const proche = await creerRendezVous({
      nom: `Test RDV Proche ${Date.now()}`,
      telephone: "+509 5000 0001",
      service: "NETTOYAGE",
      ville: "Cap-Haïtien",
      dateVoulue: new Date(Date.now() + 1 * 86_400_000),
    });
    idsRendezVous.push(proche.id);

    const { data } = await listerRendezVous({ page: 1, limit: 100 });
    const indexProche = data.findIndex((r) => r.id === proche.id);
    const indexLointain = data.findIndex((r) => r.id === lointain.id);
    expect(indexProche).toBeLessThan(indexLointain);
  });

  it("filtre par statut", async () => {
    const rdv = await creerRendezVous({
      nom: `Test RDV Statut ${Date.now()}`,
      telephone: "+509 6000 0000",
      service: "AUTRE",
      ville: "Gonaïves",
      dateVoulue: new Date(Date.now() + 5 * 86_400_000),
    });
    idsRendezVous.push(rdv.id);

    const { data: enAttente } = await listerRendezVous({ page: 1, limit: 100, statut: "EN_ATTENTE" });
    expect(enAttente.some((r) => r.id === rdv.id)).toBe(true);

    const { data: confirmes } = await listerRendezVous({ page: 1, limit: 100, statut: "CONFIRME" });
    expect(confirmes.some((r) => r.id === rdv.id)).toBe(false);
  });

  it("change le statut d'un rendez-vous", async () => {
    const rdv = await creerRendezVous({
      nom: `Test RDV Confirmation ${Date.now()}`,
      telephone: "+509 7000 0000",
      service: "VIDANGE",
      ville: "Léogâne",
      dateVoulue: new Date(Date.now() + 2 * 86_400_000),
    });
    idsRendezVous.push(rdv.id);

    const confirme = await changerStatutRendezVous(rdv.id, "CONFIRME");
    expect(confirme?.statut).toBe("CONFIRME");

    const termine = await changerStatutRendezVous(rdv.id, "TERMINE");
    expect(termine?.statut).toBe("TERMINE");
  });

  it("changerStatutRendezVous renvoie null pour un id inexistant", async () => {
    expect(await changerStatutRendezVous("id-inexistant", "CONFIRME")).toBeNull();
  });
});
