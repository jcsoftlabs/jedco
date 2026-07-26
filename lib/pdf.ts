import PDFDocument from "pdfkit";
import { formatHTG, type Centimes } from "@/lib/money";
import type { Facture, LigneFacture, Client } from "@/app/generated/prisma/client";

type FactureAvecDetails = Facture & { lignes: LigneFacture[]; client: Client };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

// Intl.NumberFormat("fr-FR") sépare les milliers avec une espace insécable
// fine (U+202F) — typographiquement correct en français et rendu correctement
// en HTML, mais absente de l'encodage WinAnsi des polices PDF standard :
// pdfkit la remplace silencieusement par « / », donnant « 25 /000,00 HTG » sur
// la facture (vérifié empiriquement en inspectant le flux de contenu du PDF
// généré). On la ramène donc à une espace insécable ordinaire (U+00A0), qui
// existe en WinAnsi et conserve le non-retour à la ligne.
function texteMonetaire(centimes: Centimes): string {
  return formatHTG(centimes).replace(/ /g, " ");
}

function montantSansDevise(centimes: Centimes): string {
  return texteMonetaire(centimes).replace(" HTG", "");
}

// Layout défini au master prompt §7.6. Buffer entier en mémoire plutôt qu'un
// vrai stream HTTP : une facture fait quelques Ko, la simplicité l'emporte
// sur le streaming pour ce volume, et Next.js sur Vercel serverless ne tire
// de toute façon aucun bénéfice d'un stream partiel ici.
export async function genererFacturePDF(facture: FactureAvecDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const largeurPage = 495; // 595 (A4 pt) - 2*50 de marge

    doc.fontSize(16).font("Helvetica-Bold").text("JEDCO Services S.A.");
    doc.fontSize(10).font("Helvetica");
    doc.text("14 bis Rue Pélican, Route de l'Aéroport, Port-au-Prince");
    doc.text("Tél: 2942-1109 | 2942-1110");
    doc.moveDown(1.5);

    doc.fontSize(14).font("Helvetica-Bold").text(`FACTURE N° ${facture.reference}`);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Date d'émission : ${formatDate(facture.dateEmission)}     Échéance : ${formatDate(facture.dateEcheance)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").text(`FACTURER À : ${facture.client.nom} — Code : ${facture.client.code}`);
    doc.moveDown(1.5);

    // ─── Tableau des lignes ───────────────────────────────────────────────
    const x = doc.page.margins.left;
    const colDescription = 220;
    const colQte = 50;
    const colPrixUnit = 120;
    const colTotal = largeurPage - colDescription - colQte - colPrixUnit;

    let y = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("Description", x, y, { width: colDescription });
    doc.text("Qté", x + colDescription, y, { width: colQte, align: "right" });
    doc.text("Prix unit. (HTG)", x + colDescription + colQte, y, { width: colPrixUnit, align: "right" });
    doc.text("Total (HTG)", x + colDescription + colQte + colPrixUnit, y, { width: colTotal, align: "right" });
    y += 16;
    doc.moveTo(x, y).lineTo(x + largeurPage, y).stroke();
    y += 8;

    doc.font("Helvetica").fontSize(10);
    for (const ligne of facture.lignes) {
      doc.text(ligne.description, x, y, { width: colDescription });
      doc.text(String(ligne.quantite), x + colDescription, y, { width: colQte, align: "right" });
      doc.text(montantSansDevise(ligne.prixUnitaireHTG), x + colDescription + colQte, y, {
        width: colPrixUnit,
        align: "right",
      });
      doc.text(
        montantSansDevise(ligne.totalHTG),
        x + colDescription + colQte + colPrixUnit,
        y,
        { width: colTotal, align: "right" }
      );
      y += 18;
    }

    y += 6;
    doc.moveTo(x, y).lineTo(x + largeurPage, y).stroke();
    y += 12;

    const tauxTaxePourcent =
      facture.montantHTG > 0n ? Number((facture.taxeHTG * 10_000n) / facture.montantHTG) / 100 : 0;

    doc.fontSize(10);
    doc.text(`Sous-total : ${texteMonetaire(facture.montantHTG)}`, x, y, { width: largeurPage, align: "right" });
    y += 15;
    doc.text(`Taxe (${tauxTaxePourcent}%) : ${texteMonetaire(facture.taxeHTG)}`, x, y, {
      width: largeurPage,
      align: "right",
    });
    y += 15;
    doc.font("Helvetica-Bold").text(`TOTAL DÛ : ${texteMonetaire(facture.totalHTG)}`, x, y, {
      width: largeurPage,
      align: "right",
    });
    y += 30;

    doc.font("Helvetica").fontSize(10);
    if (facture.modePaiement) {
      doc.text(`Mode de paiement : ${facture.modePaiement}`, x, y);
    }

    doc.end();
  });
}
