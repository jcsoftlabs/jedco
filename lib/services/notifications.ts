import { obtenirFacture } from "@/lib/services/factures";
import { obtenirDevis } from "@/lib/services/devis";
import { genererFacturePDF, genererDevisPDF } from "@/lib/pdf";
import { envoyerEmailAvecPDF } from "@/lib/email";
import { ErreurMetier } from "@/lib/errors";
import { formatHTG } from "@/lib/money";

function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export async function envoyerFactureParEmail(id: string) {
  const facture = await obtenirFacture(id);
  if (!facture) return null;
  if (!facture.client.email) {
    throw new ErreurMetier("Ce client n'a pas d'adresse e-mail enregistrée", 400);
  }

  const pdf = await genererFacturePDF(facture);
  await envoyerEmailAvecPDF({
    destinataire: facture.client.email,
    sujet: `JEDCO Services — Facture ${facture.reference}`,
    corpsHtml: `<p>Bonjour ${facture.client.nom},</p>
<p>Veuillez trouver ci-joint votre facture <strong>${facture.reference}</strong> d'un montant de
<strong>${formatHTG(facture.totalHTG)}</strong>, à régler avant le ${formatDateFr(facture.dateEcheance)}.</p>
<p>Merci de votre confiance.<br/>JEDCO Services S.A.</p>`,
    pdf,
    nomFichier: `${facture.reference}.pdf`,
  });

  return facture;
}

export async function envoyerDevisParEmail(id: string) {
  const devis = await obtenirDevis(id);
  if (!devis) return null;
  if (!devis.client.email) {
    throw new ErreurMetier("Ce client n'a pas d'adresse e-mail enregistrée", 400);
  }

  const pdf = await genererDevisPDF(devis);
  await envoyerEmailAvecPDF({
    destinataire: devis.client.email,
    sujet: `JEDCO Services — Devis ${devis.reference}`,
    corpsHtml: `<p>Bonjour ${devis.client.nom},</p>
<p>Veuillez trouver ci-joint notre devis <strong>${devis.reference}</strong> d'un montant de
<strong>${formatHTG(devis.totalHTG)}</strong>, valable jusqu'au ${formatDateFr(devis.dateValidite)}.</p>
<p>N'hésitez pas à nous contacter pour toute question.<br/>JEDCO Services S.A.</p>`,
    pdf,
    nomFichier: `${devis.reference}.pdf`,
  });

  return devis;
}
