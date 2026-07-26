import { obtenirFacture } from "@/lib/services/factures";
import { obtenirDevis } from "@/lib/services/devis";
import { genererFacturePDF, genererDevisPDF } from "@/lib/pdf";
import { envoyerEmailAvecPDF, envoyerEmailSimple } from "@/lib/email";
import { ErreurMetier } from "@/lib/errors";
import { formatHTG } from "@/lib/money";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import type { DemandeDevis } from "@/app/generated/prisma/client";

function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

// Alerte l'équipe JEDCO à chaque nouvelle demande reçue depuis le formulaire
// public. NOTIFICATIONS_EMAIL est facultative : sans elle on ne fait rien
// plutôt que d'échouer — cette fonction ne doit jamais faire échouer la
// sauvegarde du lead lui-même (voir app/api/public/demandes-devis/route.ts,
// qui l'appelle dans un try/catch pour la même raison).
export async function envoyerNotificationDemandeDevis(demande: DemandeDevis): Promise<void> {
  if (!env.NOTIFICATIONS_EMAIL) return;

  // Le libellé est relu depuis la table de référence plutôt que d’une copie
  // locale : ajouter une prestation ne doit pas obliger à mettre à jour aussi
  // le gabarit de cet e-mail.
  const type = await prisma.typeService.findUnique({ where: { code: demande.service } });
  const libelleService = type?.libelle ?? demande.service;

  await envoyerEmailSimple({
    destinataire: env.NOTIFICATIONS_EMAIL,
    sujet: `Nouvelle demande de devis — ${demande.nom}`,
    corpsHtml: `<p>Nouvelle demande reçue depuis le site public :</p>
<ul>
<li><strong>Nom :</strong> ${demande.nom}</li>
<li><strong>Téléphone :</strong> ${demande.telephone}</li>
${demande.email ? `<li><strong>E-mail :</strong> ${demande.email}</li>` : ""}
<li><strong>Service :</strong> ${libelleService}</li>
<li><strong>Ville :</strong> ${demande.ville}</li>
${demande.message ? `<li><strong>Message :</strong> ${demande.message}</li>` : ""}
</ul>
<p>À traiter dans le backoffice, section Demandes.</p>`,
  });
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
