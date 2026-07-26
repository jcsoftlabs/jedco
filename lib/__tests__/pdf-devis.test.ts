import "dotenv/config";
import { inflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { genererDevisPDF } from "../pdf";
import { creerDevis, obtenirDevis } from "@/lib/services/devis";

// Même technique de décompression que lib/__tests__/pdf.test.ts — on assert
// sur le texte réellement rendu, pas seulement sur la validité syntaxique.
function texteVisibleDuPDF(pdf: Buffer): string {
  const flux = [...pdf.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  let texte = "";
  for (const [, brut] of flux) {
    let decompresse: string;
    try {
      decompresse = inflateSync(Buffer.from(brut, "latin1")).toString("latin1");
    } catch {
      continue;
    }
    for (const [, hex] of decompresse.matchAll(/<([0-9a-fA-F]+)>/g)) {
      texte += Buffer.from(hex, "hex").toString("latin1");
    }
  }
  return texte;
}

describe("génération PDF de devis (intégration réelle)", () => {
  let clientId: string;
  let devisId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: {
        code: `TEST-PDF-DEV-${Date.now()}`,
        nom: "Client PDF Devis",
        telephone: "0000",
        email: "client-pdf-devis-test@example.com",
      },
    });
    clientId = client.id;

    const devis = await creerDevis({
      clientId,
      lignes: [
        { description: "Vidange fosse septique", quantite: 1, prixUnitaireHTG: 25_000 },
        { description: "Frais de déplacement", quantite: 2, prixUnitaireHTG: 1_500 },
      ],
      tauxTaxePourcent: 10,
      dateValiditeJours: 30,
    });
    devisId = devis.id;
  });

  afterAll(async () => {
    await prisma.ligneDevis.deleteMany({ where: { devisId } });
    await prisma.devis.delete({ where: { id: devisId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("produit un PDF valide tenant sur une seule page", async () => {
    const devis = await obtenirDevis(devisId);
    const pdf = await genererDevisPDF(devis!);

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    const count = /\/Count\s+(\d+)/.exec(pdf.toString("latin1"));
    expect(count?.[1]).toBe("1");
  });

  it("affiche DEVIS, la référence, le statut et le client — sans les paiements ni l'échéance d'une facture", async () => {
    const devis = await obtenirDevis(devisId);
    const pdf = await genererDevisPDF(devis!);
    const texte = texteVisibleDuPDF(pdf);

    expect(texte).toContain("DEVIS");
    expect(texte).toContain(devis!.reference);
    expect(texte).toContain("BROUILLON");
    expect(texte).toContain("Client PDF Devis");
    expect(texte).toContain("Valable jusqu");
    expect(texte).not.toContain("PAIEMENTS REÇUS");
  });

  it("affiche l'e-mail du client quand il est renseigné", async () => {
    const devis = await obtenirDevis(devisId);
    const pdf = await genererDevisPDF(devis!);
    const texte = texteVisibleDuPDF(pdf);

    expect(texte).toContain("client-pdf-devis-test@example.com");
  });

  it("affiche les montants sans caractère parasite dans le séparateur de milliers", async () => {
    const devis = await obtenirDevis(devisId);
    const pdf = await genererDevisPDF(devis!);
    const texte = texteVisibleDuPDF(pdf);

    expect(texte).not.toMatch(/\d\s+\/\d/);
    expect(texte).toContain("28 000,00 HTG");
  });
});
