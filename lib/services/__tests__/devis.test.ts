import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  creerDevis,
  obtenirDevis,
  modifierDevis,
  supprimerDevis,
  listerDevis,
  convertirDevisEnFacture,
} from "../devis";

describe("module Devis (intégration réelle)", () => {
  let clientId: string;
  const idsDevis: string[] = [];
  const idsFactures: string[] = [];

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: { code: `TEST-DEV-${Date.now()}`, nom: "Client devis", telephone: "0000" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.ligneFacture.deleteMany({ where: { factureId: { in: idsFactures } } });
    await prisma.facture.deleteMany({ where: { id: { in: idsFactures } } });
    await prisma.ligneDevis.deleteMany({ where: { devisId: { in: idsDevis } } });
    await prisma.devis.deleteMany({ where: { id: { in: idsDevis } } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("crée un devis avec référence DEV-<année>-XXXX et calcule les totaux en centimes", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "Vidange fosse septique", quantite: 1, prixUnitaireHTG: 25_000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);

    const annee = new Date().getFullYear();
    expect(devis.reference).toMatch(new RegExp(`^DEV-${annee}-\\d{4,}$`));
    expect(devis.statut).toBe("BROUILLON");
    expect(devis.montantHTG).toBe(2_500_000n);
    expect(devis.totalHTG).toBe(2_500_000n);
    expect(devis.lignes).toHaveLength(1);
  });

  it("calcule correctement la taxe avec plusieurs lignes", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [
        { description: "Vidange", quantite: 2, prixUnitaireHTG: 10_000 },
        { description: "Nettoyage", quantite: 1, prixUnitaireHTG: 5_000 },
      ],
      tauxTaxePourcent: 10,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);

    expect(devis.montantHTG).toBe(2_500_000n);
    expect(devis.taxeHTG).toBe(250_000n);
    expect(devis.totalHTG).toBe(2_750_000n);
  });

  it("refuse de créer un devis pour un client inexistant", async () => {
    await expect(
      creerDevis({
        clientId: "id-inexistant",
        lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 100 }],
        tauxTaxePourcent: 0,
        dateValiditeJours: 30,
      })
    ).rejects.toThrow(ErreurMetier);
  });

  it("modifie le statut d'un devis, refuse toute modification une fois converti", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);

    const envoye = await modifierDevis(devis.id, { statut: "ENVOYE" });
    expect(envoye?.statut).toBe("ENVOYE");

    const facture = await convertirDevisEnFacture(devis.id);
    idsFactures.push(facture!.id);

    await expect(modifierDevis(devis.id, { notes: "x" })).rejects.toThrow(ErreurMetier);
  });

  it("convertit un devis envoyé en facture avec les mêmes lignes et montants", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "Toilette mobile", quantite: 2, prixUnitaireHTG: 7_500 }],
      tauxTaxePourcent: 5,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);
    await modifierDevis(devis.id, { statut: "ENVOYE" });

    const facture = await convertirDevisEnFacture(devis.id);
    idsFactures.push(facture!.id);

    expect(facture!.totalHTG).toBe(devis.totalHTG);
    expect(facture!.montantHTG).toBe(devis.montantHTG);
    expect(facture!.lignes).toHaveLength(1);
    expect(facture!.reference).toMatch(/^FAC-\d{4}-\d{4,}$/);

    const devisConverti = await obtenirDevis(devis.id);
    expect(devisConverti?.statut).toBe("CONVERTI");

    const enBase = await prisma.devis.findUnique({ where: { id: devis.id } });
    expect(enBase?.factureId).toBe(facture!.id);
  });

  it("refuse de convertir deux fois le même devis", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);
    await modifierDevis(devis.id, { statut: "ENVOYE" });

    const facture = await convertirDevisEnFacture(devis.id);
    idsFactures.push(facture!.id);

    await expect(convertirDevisEnFacture(devis.id)).rejects.toThrow(ErreurMetier);
  });

  it("refuse de convertir un devis refusé ou expiré", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);
    await modifierDevis(devis.id, { statut: "ENVOYE" });
    await modifierDevis(devis.id, { statut: "REFUSE" });

    await expect(convertirDevisEnFacture(devis.id)).rejects.toThrow(ErreurMetier);
  });

  it("le soft delete masque un devis non converti", async () => {
    const devis = await creerDevis({
      clientId,
      lignes: [{ description: "x", quantite: 1, prixUnitaireHTG: 1000 }],
      tauxTaxePourcent: 0,
      dateValiditeJours: 30,
    });
    idsDevis.push(devis.id);

    await supprimerDevis(devis.id);
    expect(await obtenirDevis(devis.id)).toBeNull();
  });

  it("liste les devis filtrés par client", async () => {
    const { data, meta } = await listerDevis({ page: 1, limit: 100, clientId });
    expect(meta.total).toBeGreaterThan(0);
    expect(data.every((d) => d.clientId === clientId)).toBe(true);
  });
});
