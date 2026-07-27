import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  creerToilette,
  modifierToilette,
  demarrerLocation,
  terminerLocation,
  supprimerToilette,
  listerToilettes,
  statsToilettes,
} from "../toilettes";

describe("module ToilettesMobiles (intégration réelle)", () => {
  const idsToilettes: string[] = [];
  const idsClients: string[] = [];

  afterAll(async () => {
    await prisma.toiletteMobile.deleteMany({ where: { id: { in: idsToilettes } } });
    await prisma.client.deleteMany({ where: { id: { in: idsClients } } });
    await prisma.$disconnect();
  });

  async function creerClientTest() {
    const client = await prisma.client.create({
      data: { code: `TEST-TLT-${Date.now()}-${Math.random()}`, nom: "Client toilette", telephone: "0000" },
    });
    idsClients.push(client.id);
    return client;
  }

  it("crée une toilette DISPONIBLE avec un code TLT-XXX", async () => {
    const toilette = await creerToilette({ localisationActuelle: "Entrepôt" });
    idsToilettes.push(toilette.id);

    expect(toilette.code).toMatch(/^TLT-\d{3,}$/);
    expect(toilette.statut).toBe("DISPONIBLE");
  });

  it("refuse de passer directement à LOUEE via modifierToilette", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);

    await expect(modifierToilette(toilette.id, { statut: "LOUEE" })).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("démarre une location, puis refuse une seconde location tant que la première n'est pas terminée", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);
    const client = await creerClientTest();
    const autreClient = await creerClientTest();

    const louee = await demarrerLocation(toilette.id, {
      clientId: client.id,
      dateDebutLocation: new Date(),
    });
    expect(louee?.statut).toBe("LOUEE");
    expect(louee?.clientId).toBe(client.id);

    await expect(
      demarrerLocation(toilette.id, { clientId: autreClient.id, dateDebutLocation: new Date() })
    ).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("termine une location et libère la toilette", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);
    const client = await creerClientTest();

    await demarrerLocation(toilette.id, { clientId: client.id, dateDebutLocation: new Date() });
    const liberee = await terminerLocation(toilette.id);

    expect(liberee?.statut).toBe("DISPONIBLE");
    expect(liberee?.clientId).toBeNull();
  });

  it("refuse de terminer une location sur une toilette qui n'est pas louée", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);
    await expect(terminerLocation(toilette.id)).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("refuse de supprimer une toilette actuellement louée", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);
    const client = await creerClientTest();
    await demarrerLocation(toilette.id, { clientId: client.id, dateDebutLocation: new Date() });

    await expect(supprimerToilette(toilette.id)).rejects.toBeInstanceOf(ErreurMetier);

    // Nettoyage pour ne pas fausser statsToilettes des autres tests.
    await terminerLocation(toilette.id);
  });

  it("liste et filtre par statut, et statsToilettes compte cohéremment", async () => {
    const toilette = await creerToilette({});
    idsToilettes.push(toilette.id);

    const { data } = await listerToilettes({ page: 1, limit: 100, statut: "DISPONIBLE" });
    expect(data.some((t) => t.id === toilette.id)).toBe(true);

    const stats = await statsToilettes();
    expect(stats.total).toBeGreaterThanOrEqual(stats.disponibles);
    expect(stats.disponibles + stats.louees + stats.enMaintenance).toBe(stats.total);
  });
});
