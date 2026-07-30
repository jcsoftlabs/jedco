import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { codeToilette } from "@/lib/codes";
import { genererFacturesLocationsToilettes } from "../facturation-recurrente";

describe("facturation récurrente des locations de toilettes mobiles (intégration réelle)", () => {
  let clientId: string;
  const idsToilettes: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-TLTFAC-${Date.now()}`, nom: "Client location toilette", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.ligneFacture.deleteMany({ where: { facture: { toiletteMobileId: { in: idsToilettes } } } });
    await prisma.facture.deleteMany({ where: { toiletteMobileId: { in: idsToilettes } } });
    await prisma.toiletteMobile.deleteMany({ where: { id: { in: idsToilettes } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  async function nouvelleLocation(overrides: { tarifMensuelHTG: bigint | null; dateDebutLocation: Date }) {
    const code = await codeToilette();
    const toilette = await prisma.toiletteMobile.create({
      data: {
        code,
        statut: "LOUEE",
        clientId,
        dateDebutLocation: overrides.dateDebutLocation,
        tarifMensuelHTG: overrides.tarifMensuelHTG,
      },
    });
    idsToilettes.push(toilette.id);
    return toilette;
  }

  it("génère une facture pour une toilette louée avec un tarif mensuel renseigné", async () => {
    const maintenant = new Date("2027-04-15T12:00:00Z");
    const toilette = await nouvelleLocation({
      tarifMensuelHTG: 1_500_00n,
      dateDebutLocation: new Date("2027-04-01"),
    });

    const resultat = await genererFacturesLocationsToilettes(maintenant);
    expect(resultat.ignore).toBe(false);

    const facture = await prisma.facture.findUnique({
      where: { toiletteMobileId_periode: { toiletteMobileId: toilette.id, periode: "2027-04" } },
    });
    expect(facture).not.toBeNull();
    expect(facture?.totalHTG).toBe(1_500_00n);
    expect(facture?.clientId).toBe(clientId);
  });

  it("ne facture jamais une toilette louée sans tarif mensuel renseigné", async () => {
    const maintenant = new Date("2027-05-15T12:00:00Z");
    const toilette = await nouvelleLocation({ tarifMensuelHTG: null, dateDebutLocation: new Date("2027-05-01") });

    await genererFacturesLocationsToilettes(maintenant);

    const facture = await prisma.facture.findUnique({
      where: { toiletteMobileId_periode: { toiletteMobileId: toilette.id, periode: "2027-05" } },
    });
    expect(facture).toBeNull();
  });

  it("ne facture pas avant la date de début de la location", async () => {
    const maintenant = new Date("2027-06-01T12:00:00Z");
    const toilette = await nouvelleLocation({
      tarifMensuelHTG: 1_000_00n,
      dateDebutLocation: new Date("2027-07-15"), // dans le futur par rapport à `maintenant`
    });

    await genererFacturesLocationsToilettes(maintenant);

    const facture = await prisma.facture.findUnique({
      where: { toiletteMobileId_periode: { toiletteMobileId: toilette.id, periode: "2027-06" } },
    });
    expect(facture).toBeNull();
  });

  it("est idempotente : un second passage sur la même période ne recrée rien", async () => {
    const maintenant = new Date("2027-07-15T12:00:00Z");
    const toilette = await nouvelleLocation({
      tarifMensuelHTG: 2_000_00n,
      dateDebutLocation: new Date("2027-07-01"),
    });

    const premier = await genererFacturesLocationsToilettes(maintenant);
    expect(premier.genere).toBeGreaterThanOrEqual(1);

    const deuxieme = await genererFacturesLocationsToilettes(maintenant);
    expect(deuxieme.genere).toBe(0);

    const factures = await prisma.facture.findMany({
      where: { toiletteMobileId: toilette.id, periode: "2027-07" },
    });
    expect(factures).toHaveLength(1);
  });
});
