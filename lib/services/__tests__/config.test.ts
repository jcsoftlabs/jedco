import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { obtenirTauxUsd, definirTauxUsd, desactiverTauxUsd, CLE_TAUX_USD } from "../config";
import { creerFacture, obtenirFacture } from "../factures";
import { decoderTaux } from "@/lib/money";

describe("taux de change administrable (intégration réelle)", () => {
  let valeurInitiale: string | null = null;
  let clientId: string;
  const idsFactures: string[] = [];

  // Ce fichier manipule un VRAI paramètre métier partagé : on capture sa
  // valeur avant, on la restaure après. C'est précisément l'omission qui a
  // laissé « 150 » se figer sur une facture client réelle.
  beforeAll(async () => {
    const config = await prisma.config.findUnique({ where: { cle: CLE_TAUX_USD } });
    valeurInitiale = config?.valeur ?? null;

    const client = await prisma.client.create({
      data: { code: `TEST-TAUX-${Date.now()}`, nom: "Client taux", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.client.deleteMany({ where: { id: clientId } });

    if (valeurInitiale !== null) {
      await prisma.config.upsert({
        where: { cle: CLE_TAUX_USD },
        create: { cle: CLE_TAUX_USD, valeur: valeurInitiale },
        update: { valeur: valeurInitiale },
      });
    } else {
      await prisma.config.deleteMany({ where: { cle: CLE_TAUX_USD } });
    }
    await prisma.$disconnect();
  });

  it("enregistre un taux et le relit avec sa date de mise à jour", async () => {
    const taux = await definirTauxUsd(133.25);
    expect(taux.valeur).toBe(133.25);
    expect(taux.misAJourLe).toBeInstanceOf(Date);

    const relu = await obtenirTauxUsd();
    expect(relu.valeur).toBe(133.25);
  });

  it("arrondit à 4 décimales, la précision réellement conservée sur les factures", async () => {
    const taux = await definirTauxUsd(132.123456789);
    expect(taux.valeur).toBe(132.1235);
  });

  it("refuse une saisie aberrante plutôt que de la figer sur des factures", async () => {
    await expect(definirTauxUsd(0)).rejects.toThrow(ErreurMetier);
    await expect(definirTauxUsd(-10)).rejects.toThrow(ErreurMetier);
    await expect(definirTauxUsd(999_999)).rejects.toThrow(/entre/);
  });

  it("le taux saisi par l'admin est celui figé sur une facture émise ensuite", async () => {
    await definirTauxUsd(140.5);

    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    expect(decoderTaux(facture.tauxUsdApplique!)).toBeCloseTo(140.5, 4);

    // Modifier le taux ensuite ne doit rien changer au document déjà émis.
    await definirTauxUsd(160);
    const relue = await obtenirFacture(facture.id);
    expect(decoderTaux(relue!.tauxUsdApplique!)).toBeCloseTo(140.5, 4);
  });

  it("désactiver le taux retire l'équivalent USD des documents suivants", async () => {
    await desactiverTauxUsd();

    const vide = await obtenirTauxUsd();
    expect(vide.valeur).toBeNull();

    const facture = await creerFacture({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateEcheanceJours: 30,
    });
    idsFactures.push(facture.id);

    // lib/pdf.ts omet la ligne « Équivalent indicatif » quand ce champ est nul.
    expect(facture.tauxUsdApplique).toBeNull();
  });
});
