import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { decoderTaux } from "@/lib/money";
import {
  creerFacture,
  obtenirFacture,
  modifierFacture,
  supprimerFacture,
  listerFactures,
  marquerFacturesEnRetard,
  statsFactures,
  totauxFactures,
} from "../factures";

describe("module Factures (intégration réelle)", () => {
  let clientId: string;
  const idsFactures: string[] = [];
  const idsInterventions: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-FAC-${Date.now()}`, nom: "Client factures", telephone: "0000", ville: "VilleFactureTest" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.paiement.deleteMany({ where: { facture: { id: { in: idsFactures } } } });
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.intervention.deleteMany({ where: { id: { in: idsInterventions } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("crée une facture avec référence FAC-<année>-XXXX et calcule les totaux en centimes", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "Vidange fosse septique", quantite: 1, prixUnitaireHTG: 25_000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    const annee = new Date().getFullYear();
    expect(facture.reference).toMatch(new RegExp(`^FAC-${annee}-\\d{4,}$`));
    expect(facture.montantHTG).toBe(2_500_000n);
    expect(facture.totalHTG).toBe(2_500_000n);
    expect(facture.lignes).toHaveLength(1);
    expect(facture.lignes[0].totalHTG).toBe(2_500_000n);
  });

  it("calcule correctement la taxe et le total avec plusieurs lignes et quantités", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [
        { description: "Vidange", quantite: 2, prixUnitaireHTG: 10_000 },
        { description: "Nettoyage", quantite: 1, prixUnitaireHTG: 5_000 },
      ],
      tauxTaxePourcent: 10,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    // Sous-total : 2*10000 + 1*5000 = 25000 HTG. Taxe 10% = 2500 HTG.
    expect(facture.montantHTG).toBe(2_500_000n);
    expect(facture.taxeHTG).toBe(250_000n);
    expect(facture.totalHTG).toBe(2_750_000n);
  });

  it("refuse de créer une facture pour un client inexistant", async () => {
    await expect(
      creerFacture({
        clientId: "id-inexistant",
        lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 100 }],
        tauxTaxePourcent: 0,
        dateEcheanceJours: 30,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("refuse une deuxième facture sur la même intervention (contrainte unique)", async () => {
    const intervention = await prisma.intervention.create({
      data: {
        reference: `TEST-INT-FAC-${Date.now()}`,
        clientId,
        type: "VIDANGE",
        adresse: "x",
        ville: "x",
        statut: "COMPLETE",
      },
    });
    idsInterventions.push(intervention.id);

    const premiere = await creerFacture({
      clientId,
      interventionId: intervention.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(premiere.id);

    await expect(
      creerFacture({
        clientId,
        interventionId: intervention.id,
        lignes: [{ description: "y", quantite: 1, prixUnitaireHTG: 1000 }],
        tauxTaxePourcent: 0,
        dateEcheanceJours: 30,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("fige le taux USD au moment de l'émission — indépendant de sa valeur ultérieure", async () => {
    // Le taux de change est un paramètre MÉTIER saisi par l'admin, pas une
    // donnée de test : ce test l'écrase temporairement et DOIT le restaurer.
    // Sans cette restauration, il laissait « 150 » derrière lui — valeur qui
    // s'est retrouvée figée sur une vraie facture client, la base de test
    // étant partagée avec la production.
    const valeurInitiale = await prisma.config.findUnique({ where: { cle: "TAUX_USD_HTG" } });

    try {
      await prisma.config.upsert({
        where: { cle: "TAUX_USD_HTG" },
        create: { cle: "TAUX_USD_HTG", valeur: "132.5" },
        update: { valeur: "132.5" },
      });

      const facture = await creerFacture({
        clientId,
        lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1325 }],
        tauxTaxePourcent: 0,
        dateEcheanceJours: 30,
      });
      idsFactures.push(facture.id);

      expect(facture.tauxUsdApplique).not.toBeNull();
      expect(decoderTaux(facture.tauxUsdApplique!)).toBeCloseTo(132.5, 4);

      // Le taux change après coup — la facture déjà émise ne doit pas bouger.
      await prisma.config.update({ where: { cle: "TAUX_USD_HTG" }, data: { valeur: "151.75" } });
      const relue = await obtenirFacture(facture.id);
      expect(decoderTaux(relue!.tauxUsdApplique!)).toBeCloseTo(132.5, 4);
    } finally {
      // Restauration à l'identique, y compris l'absence de configuration.
      if (valeurInitiale) {
        await prisma.config.update({
          where: { cle: "TAUX_USD_HTG" },
          data: { valeur: valeurInitiale.valeur },
        });
      } else {
        await prisma.config.deleteMany({ where: { cle: "TAUX_USD_HTG" } });
      }
    }
  });

  it("modifie une facture sans paiement, refuse si un paiement existe", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    const modifiee = await modifierFacture(facture.id, { notes: "note ajoutée" });
    expect(modifiee?.notes).toBe("note ajoutée");

    await prisma.paiement.create({
      data: {
        factureId: facture.id,
        montantHTG: 50_000n,
        mode: "CASH",
        idempotencyKey: `test-${Date.now()}`,
        createdBy: "test",
      },
    });

    await expect(modifierFacture(facture.id, { notes: "autre" })).rejects.toThrow(ErreurMetier);
  });

  it("modifie les lignes d'une facture non payée et recalcule les totaux", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "Ligne initiale", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    const modifiee = await modifierFacture(facture.id, {
      lignes: [
        { description: "Vidange", quantite: 2, prixUnitaireHTG: 5_000 },
        { description: "Nettoyage", quantite: 1, prixUnitaireHTG: 2_000 },
      ],
      tauxTaxePourcent: 10,
    });

    expect(modifiee?.lignes).toHaveLength(2);
    // Sous-total : 2*5000 + 1*2000 = 12000 HTG. Taxe 10% = 1200 HTG.
    expect(modifiee?.montantHTG).toBe(1_200_000n);
    expect(modifiee?.taxeHTG).toBe(120_000n);
    expect(modifiee?.totalHTG).toBe(1_320_000n);
  });

  it("refuse de modifier les lignes d'une facture qui a déjà des paiements", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    await prisma.paiement.create({
      data: {
        factureId: facture.id,
        montantHTG: 10_000n,
        mode: "CASH",
        idempotencyKey: `test-lignes-${Date.now()}`,
        createdBy: "test",
      },
    });

    await expect(
      modifierFacture(facture.id, {
        lignes: [{ description: "y", quantite: 1, prixUnitaireHTG: 2000 }],
        tauxTaxePourcent: 0,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("le soft delete refuse si des paiements existent", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    await prisma.paiement.create({
      data: {
        factureId: facture.id,
        montantHTG: 50_000n,
        mode: "CASH",
        idempotencyKey: `test-${Date.now()}-b`,
        createdBy: "test",
      },
    });

    await expect(supprimerFacture(facture.id)).rejects.toThrow(ErreurMetier);
  });

  it("le soft delete fonctionne sans paiement et masque la facture", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    await supprimerFacture(facture.id);
    expect(await obtenirFacture(facture.id)).toBeNull();
  });

  it("marquerFacturesEnRetard bascule les factures impayées dont l'échéance est dépassée", async () => {
    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    await prisma.facture.update({ where: { id: facture.id }, data: { dateEcheance: new Date("2020-01-01") } });

    const nombre = await marquerFacturesEnRetard();
    expect(nombre).toBeGreaterThanOrEqual(1);

    const enBase = await prisma.facture.findUnique({ where: { id: facture.id } });
    expect(enBase?.statut).toBe("EN_RETARD");

    // Idempotente : un second passage ne retrouve plus rien pour cette facture.
    await prisma.facture.update({ where: { id: facture.id }, data: { dateEcheance: new Date("2020-01-01") } });
    const enBase2 = await prisma.facture.findUnique({ where: { id: facture.id } });
    expect(enBase2?.statut).toBe("EN_RETARD");
  });

  it("liste les factures filtrées par client et pagine", async () => {
    const { data, meta } = await listerFactures({ page: 1, limit: 100, clientId });
    // Une facture précédente a été soft-deleted dans un test antérieur — elle
    // ne doit plus apparaître ici, d'où total < nombre de factures créées.
    expect(meta.total).toBe(idsFactures.length - 1);
    expect(data.every((f) => f.clientId === clientId)).toBe(true);
    expect(data.every((f) => f.deletedAt === null)).toBe(true);
  });

  it("statsFactures agrège les revenus par service et par ville", async () => {
    const stats = await statsFactures({});
    expect(stats.nombreFactures).toBeGreaterThan(0);
    expect(stats.totalFactureHTG).toBeGreaterThan(0n);
    expect(stats.revenusParVille["VilleFactureTest"]).toBeGreaterThan(0n);
  });

  // La page Facturation est passée de statsFactures (qui charge toute la
  // table) à totauxFactures (agrégation SQL). Une divergence entre les deux
  // afficherait des montants faux sans lever la moindre erreur — d'où cette
  // comparaison directe, sur les mêmes données réelles.
  it("totauxFactures donne exactement les mêmes totaux que statsFactures", async () => {
    const [totaux, stats] = await Promise.all([totauxFactures(), statsFactures({})]);

    expect(totaux.totalFactureHTG).toBe(stats.totalFactureHTG);
    expect(totaux.totalPayeHTG).toBe(stats.totalPayeHTG);
    expect(totaux.totalImpayeHTG).toBe(stats.totalImpayeHTG);
    expect(totaux.nombreFactures).toBe(stats.nombreFactures);
  });

  it("la recherche trouve une facture par le nom du client (jointure), insensible aux accents", async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-FAC-RECH-${Date.now()}`, nom: "Frantzy Néré Unique", telephone: "0000" },
    });
    const facture = await creerFacture({
      clientId: client.id,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });

    try {
      const { data } = await listerFactures({ page: 1, limit: 1, search: "frantzy nere" });
      expect(data.some((f) => f.id === facture.id)).toBe(true);

      const parReference = await listerFactures({ page: 1, limit: 100, search: facture.reference });
      expect(parReference.data.some((f) => f.id === facture.id)).toBe(true);
    } finally {
      await prisma.ligneFacture.deleteMany({ where: { factureId: facture.id } });
      await prisma.facture.delete({ where: { id: facture.id } });
      await prisma.client.delete({ where: { id: client.id } });
    }
  });
});
