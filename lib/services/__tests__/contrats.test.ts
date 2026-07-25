import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { centimesToHTG } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import {
  creerContrat,
  obtenirContrat,
  modifierContrat,
  supprimerContrat,
  renouvelerContrat,
  marquerContratsExpires,
} from "../contrats";

describe("module Contrats (intégration réelle)", () => {
  let clientId: string;
  const idsContrats: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-CTR-${Date.now()}`, nom: "Client pour contrats", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.contrat.deleteMany({ where: { id: { in: idsContrats } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("crée un contrat avec une référence CTR-<année>-XXXX et un montant en centimes", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "MENSUEL",
      services: ["VIDANGE"],
      montantHTG: 25_000,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-12-31"),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    const annee = new Date().getFullYear();
    expect(contrat.reference).toMatch(new RegExp(`^CTR-${annee}-\\d{4,}$`));
    expect(contrat.montantHTG).toBe(2_500_000n);
    expect(centimesToHTG(contrat.montantHTG)).toBe(25_000);
  });

  it("refuse de créer un contrat pour un client inexistant", async () => {
    await expect(
      creerContrat({
        clientId: "id-qui-nexiste-pas",
        type: "PONCTUEL",
        services: ["NETTOYAGE"],
        montantHTG: 1000,
        dateDebut: new Date("2026-01-01"),
        dateFin: new Date("2026-01-02"),
        renouvellementAuto: false,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("modifie un contrat, y compris le montant reconverti en centimes", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "TRIMESTRIEL",
      services: ["COLLECTE"],
      montantHTG: 10_000,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-03-31"),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    const modifie = await modifierContrat(contrat.id, { montantHTG: 15_000 });
    expect(modifie?.montantHTG).toBe(1_500_000n);
  });

  it("le soft delete résilie le contrat plutôt que de le supprimer physiquement", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "PONCTUEL",
      services: ["AUTRE"],
      montantHTG: 500,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-01-02"),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    await supprimerContrat(contrat.id);

    expect(await obtenirContrat(contrat.id)).toBeNull();
    const enBase = await prisma.contrat.findUnique({ where: { id: contrat.id } });
    expect(enBase?.deletedAt).not.toBeNull();
    expect(enBase?.statut).toBe("RESILIE");
  });

  it("renouvelle un contrat mensuel en avançant la date de fin d'un mois", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "MENSUEL",
      services: ["VIDANGE"],
      montantHTG: 5_000,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-02-01"),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    const renouvele = await renouvelerContrat(contrat.id);
    expect(renouvele?.dateFin.toISOString().slice(0, 10)).toBe("2026-03-01");
    expect(renouvele?.statut).toBe("ACTIF");
  });

  it("refuse de renouveler un contrat ponctuel", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "PONCTUEL",
      services: ["AUTRE"],
      montantHTG: 500,
      dateDebut: new Date("2026-01-01"),
      dateFin: new Date("2026-01-02"),
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    await expect(renouvelerContrat(contrat.id)).rejects.toThrow(ErreurMetier);
  });

  it("marquerContratsExpires bascule les contrats ACTIF dont la date de fin est dépassée", async () => {
    const contrat = await creerContrat({
      clientId,
      type: "PONCTUEL",
      services: ["AUTRE"],
      montantHTG: 500,
      dateDebut: new Date("2020-01-01"),
      dateFin: new Date("2020-02-01"), // largement dans le passé
      renouvellementAuto: false,
    });
    idsContrats.push(contrat.id);

    const nombreMarques = await marquerContratsExpires();
    expect(nombreMarques).toBeGreaterThanOrEqual(1);

    const enBase = await prisma.contrat.findUnique({ where: { id: contrat.id } });
    expect(enBase?.statut).toBe("EXPIRE");
  });

  it("marquerContratsExpires est idempotente — un second passage ne retouche rien de plus", async () => {
    const premierPassage = await marquerContratsExpires();
    const deuxiemePassage = await marquerContratsExpires();
    expect(deuxiemePassage).toBeLessThanOrEqual(premierPassage);
    // Rejouer immédiatement sur le même état ne doit rien trouver de nouveau
    // à marquer (les contrats déjà EXPIRE ne sont plus dans le filtre ACTIF).
    expect(await marquerContratsExpires()).toBe(0);
  });
});
