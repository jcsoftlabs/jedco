import "dotenv/config";
import { inflateSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { genererFacturePDF } from "../pdf";
import { creerFacture, obtenirFacture } from "@/lib/services/factures";

// Décompresse les flux de contenu du PDF et reconstitue le texte affiché, pour
// pouvoir assertir sur ce que le lecteur verra réellement — et pas seulement
// sur le fait que le fichier est un PDF syntaxiquement valide.
function texteVisibleDuPDF(pdf: Buffer): string {
  const flux = [...pdf.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  let texte = "";
  for (const [, brut] of flux) {
    let decompresse: string;
    try {
      decompresse = inflateSync(Buffer.from(brut, "latin1")).toString("latin1");
    } catch {
      continue; // flux non compressé (polices, etc.)
    }
    // Les opérateurs TJ portent le texte sous forme de littéraux hexadécimaux.
    for (const [, hex] of decompresse.matchAll(/<([0-9a-fA-F]+)>/g)) {
      texte += Buffer.from(hex, "hex").toString("latin1");
    }
  }
  return texte;
}

describe("génération PDF de facture (intégration réelle)", () => {
  let clientId: string;
  let factureId: string;

  beforeAll(async () => {
    const client = await prisma.client.create({
      data: {
        code: `TEST-PDF-${Date.now()}`,
        nom: "Client PDF Test",
        telephone: "0000",
        email: "client-pdf-test@example.com",
      },
    });
    clientId = client.id;

    const facture = await creerFacture({
      clientId,
      lignes: [
        { description: "Vidange fosse septique", quantite: 1, prixUnitaireHTG: 25_000 },
        { description: "Frais de déplacement", quantite: 2, prixUnitaireHTG: 1_500 },
      ],
      tauxTaxePourcent: 10,
      dateEcheanceJours: 30,
    });
    factureId = facture.id;
  });

  afterAll(async () => {
    await prisma.ligneFacture.deleteMany({ where: { factureId } });
    await prisma.facture.delete({ where: { id: factureId } });
    await prisma.client.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("produit un PDF valide (signature %PDF, taille non triviale)", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);

    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
    // Un PDF bien formé se termine par %%EOF.
    expect(pdf.subarray(-8).toString("ascii")).toContain("%%EOF");
  });

  it("affiche les montants sans caractère parasite dans le séparateur de milliers", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);
    const texte = texteVisibleDuPDF(pdf);

    // Régression : l'espace insécable fine U+202F d'Intl.NumberFormat("fr-FR")
    // n'existe pas en WinAnsi et était rendue « / » par pdfkit, produisant
    // « 25 /000,00 HTG » sur la facture du client. La signature du bug est un
    // slash PRÉCÉDÉ d'une espace — les slashs de date (« 25/07/2026 ») n'en
    // ont pas et ne doivent pas déclencher cette assertion.
    expect(texte).not.toMatch(/\d\s+\/\d/);
    // Sous-total attendu : 25 000 + 2×1 500 = 28 000 HTG, séparateur ASCII.
    expect(texte).toContain("28 000,00 HTG");
  });

  it("affiche les mentions légales et l'identité du client", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);
    const texte = texteVisibleDuPDF(pdf);

    expect(texte).toContain("JEDCO Services S.A.");
    expect(texte).toContain(facture!.reference);
    expect(texte).toContain("Client PDF Test");
    expect(texte).toContain("Vidange fosse septique");
  });

  it("affiche l'e-mail du client quand il est renseigné", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);
    const texte = texteVisibleDuPDF(pdf);

    expect(texte).toContain("client-pdf-test@example.com");
  });

  it("tient sur une seule page", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);

    // Régression : le pied de page dépassait la marge basse, ce qui poussait
    // pdfkit à ajouter automatiquement une seconde page vierge — imprimée pour
    // rien à chaque facture.
    const count = /\/Count\s+(\d+)/.exec(pdf.toString("latin1"));
    expect(count?.[1]).toBe("1");
  });

  it("intègre le logo de l'entreprise", async () => {
    const facture = await obtenirFacture(factureId);
    const pdf = await genererFacturePDF(facture!);

    // Une image intégrée déclare un XObject de sous-type /Image. Sans logo,
    // genererFacturePDF retombe silencieusement sur un en-tête typographique —
    // ce test garantit qu'on s'en aperçoit.
    expect(pdf.toString("latin1")).toMatch(/\/Subtype\s*\/Image/);
  });
});
