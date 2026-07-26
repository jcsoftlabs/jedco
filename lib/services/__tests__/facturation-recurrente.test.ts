import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { prisma } from "@/lib/db";
import { referenceContrat } from "@/lib/codes";
import { genererFacturesRecurrentes } from "../facturation-recurrente";

describe("facturation récurrente des contrats sous verrou (§1.9, intégration réelle)", () => {
  let clientId: string;
  const idsContrats: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-CRON-${Date.now()}`, nom: "Client cron", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    // Nettoyage exhaustif plutôt qu'un suivi manuel des factures créées : un
    // contrat MENSUEL reste éligible à chaque appel de
    // genererFacturesRecurrentes fait par les tests suivants (périodes
    // différentes), donc des factures "collatérales" apparaissent pour des
    // contrats d'un test antérieur — les traquer une par une serait fragile.
    await prisma.ligneFacture.deleteMany({ where: { facture: { contratId: { in: idsContrats } } } });
    await prisma.facture.deleteMany({ where: { contratId: { in: idsContrats } } });
    await prisma.contrat.deleteMany({ where: { id: { in: idsContrats } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  async function nouveauContrat(overrides: {
    type: "MENSUEL" | "TRIMESTRIEL" | "ANNUEL" | "PONCTUEL";
    dateDebut: Date;
  }) {
    const reference = await referenceContrat();
    const contrat = await prisma.contrat.create({
      data: {
        reference,
        clientId,
        type: overrides.type,
        services: ["VIDANGE"],
        montantHTG: 500_000n, // 5000 HTG
        dateDebut: overrides.dateDebut,
        dateFin: new Date("2030-01-01"),
        statut: "ACTIF",
      },
    });
    idsContrats.push(contrat.id);
    return contrat;
  }

  it("génère une facture pour un contrat mensuel actif", async () => {
    const maintenant = new Date("2027-04-15T12:00:00Z");
    const contrat = await nouveauContrat({ type: "MENSUEL", dateDebut: new Date("2027-01-01") });

    const resultat = await genererFacturesRecurrentes(maintenant);
    expect(resultat.ignore).toBe(false);
    expect(resultat.periode).toBe("2027-04");

    const facture = await prisma.facture.findUnique({
      where: { contratId_periode: { contratId: contrat.id, periode: "2027-04" } },
    });
    expect(facture).not.toBeNull();
    expect(facture?.totalHTG).toBe(500_000n);
  });

  it("ne facture PAS un contrat trimestriel un mois où il n'est pas dû", async () => {
    // dateDebut janvier 2027, trimestriel → dû en janvier, avril, juillet...
    // Mars n'est pas un mois de facturation pour ce contrat.
    const contrat = await nouveauContrat({ type: "TRIMESTRIEL", dateDebut: new Date("2027-01-01") });
    const mars = new Date("2027-03-15T12:00:00Z");

    await genererFacturesRecurrentes(mars);

    const facture = await prisma.facture.findUnique({
      where: { contratId_periode: { contratId: contrat.id, periode: "2027-03" } },
    });
    expect(facture).toBeNull();
  });

  it("facture un contrat trimestriel le mois où il est dû", async () => {
    const contrat = await nouveauContrat({ type: "TRIMESTRIEL", dateDebut: new Date("2027-01-01") });
    const avril = new Date("2027-04-15T12:00:00Z"); // 3 mois après janvier

    const resultat = await genererFacturesRecurrentes(avril);
    expect(resultat.genere).toBeGreaterThanOrEqual(1);

    const facture = await prisma.facture.findUnique({
      where: { contratId_periode: { contratId: contrat.id, periode: "2027-04" } },
    });
    expect(facture).not.toBeNull();
  });

  it("ne facture jamais un contrat PONCTUEL", async () => {
    const contrat = await nouveauContrat({ type: "PONCTUEL", dateDebut: new Date("2027-01-01") });
    const maintenant = new Date("2027-05-15T12:00:00Z");

    await genererFacturesRecurrentes(maintenant);

    const facture = await prisma.facture.findUnique({
      where: { contratId_periode: { contratId: contrat.id, periode: "2027-05" } },
    });
    expect(facture).toBeNull();
  });

  it("est idempotente : un second passage sur la même période ne recrée rien", async () => {
    const contrat = await nouveauContrat({ type: "MENSUEL", dateDebut: new Date("2027-01-01") });
    const maintenant = new Date("2027-06-15T12:00:00Z");

    const premier = await genererFacturesRecurrentes(maintenant);
    expect(premier.genere).toBeGreaterThanOrEqual(1);

    const deuxieme = await genererFacturesRecurrentes(maintenant);
    expect(deuxieme.ignore).toBe(false); // le verrou est libéré entre les deux appels séquentiels
    expect(deuxieme.genere).toBe(0); // rien à générer, déjà fait

    const factures = await prisma.facture.findMany({
      where: { contratId: contrat.id, periode: "2027-06" },
    });
    expect(factures).toHaveLength(1);
  });

  it("se retire sans rien faire quand le verrou de période est déjà détenu", async () => {
    const contrat = await nouveauContrat({ type: "MENSUEL", dateDebut: new Date("2027-01-01") });
    const maintenant = new Date("2027-07-15T12:00:00Z");

    // Détient le verrou depuis une connexion indépendante, puis appelle la
    // génération. Test déterministe de la propriété d'exclusion elle-même : ne
    // dépend d'aucun entrelacement de timing, contrairement à un simple
    // Promise.all où les deux appels peuvent se succéder sans se recouvrir.
    const detenteur = new Client({ connectionString: process.env.DIRECT_URL });
    await detenteur.connect();
    try {
      const { rows } = await detenteur.query(
        "SELECT pg_try_advisory_lock(hashtext($1)) AS obtenu",
        ["facturation-recurrente:2027-07"]
      );
      expect(rows[0].obtenu).toBe(true);

      const resultat = await genererFacturesRecurrentes(maintenant);
      expect(resultat.ignore).toBe(true);
      expect(resultat.genere).toBe(0);

      const factures = await prisma.facture.findMany({
        where: { contratId: contrat.id, periode: "2027-07" },
      });
      expect(factures).toHaveLength(0);
    } finally {
      await detenteur.query("SELECT pg_advisory_unlock(hashtext($1))", [
        "facturation-recurrente:2027-07",
      ]);
      await detenteur.end();
    }
  });

  it("ne crée jamais qu'une facture par contrat et par période, même en appels simultanés", async () => {
    const contrat = await nouveauContrat({ type: "MENSUEL", dateDebut: new Date("2027-01-01") });
    const maintenant = new Date("2027-08-15T12:00:00Z");

    // Invariant métier, indépendant du timing : que les deux exécutions se
    // recouvrent réellement ou se succèdent, le résultat visible doit être le
    // même — une seule facture. Le verrou évite le travail redondant, la
    // contrainte unique (contratId, periode) garantit le résultat.
    await Promise.all([
      genererFacturesRecurrentes(maintenant),
      genererFacturesRecurrentes(maintenant),
    ]);

    const factures = await prisma.facture.findMany({
      where: { contratId: contrat.id, periode: "2027-08" },
    });
    expect(factures).toHaveLength(1);
  });
});
