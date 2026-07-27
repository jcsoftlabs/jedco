import { prisma } from "@/lib/db";
import { envoyerEmailSimple } from "@/lib/email";
import { formatHTG } from "@/lib/money";
import { consignerAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

// Le système savait qu'une facture était en retard (marquerFacturesEnRetard)
// mais ne le disait à personne — ni au client, ni à JEDCO. En Haïti comme
// ailleurs, l'encaissement se joue sur la relance : ce module envoie un
// rappel par e-mail au client à des paliers croissants de retard.
export const ACTION_RELANCE = "facture.relance-envoyee";

// Ordre croissant significatif : on n'envoie jamais qu'UNE relance par
// exécution, celle du palier le plus élevé atteint et pas encore envoyé. Si
// le lot a manqué plusieurs nuits et qu'une facture saute directement de 5 à
// 20 jours de retard, on envoie la relance « 15 jours », pas les deux
// d'un coup — un client ne doit jamais recevoir trois rappels le même matin
// pour la faute du cron, pas la sienne.
export const PALIERS_RELANCE_JOURS = [7, 15, 30] as const;

function joursDeRetard(dateEcheance: Date, maintenant: Date): number {
  return Math.floor((maintenant.getTime() - dateEcheance.getTime()) / 86_400_000);
}

function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function corpsRelance(
  facture: { reference: string; totalHTG: bigint; dateEcheance: Date },
  client: { nom: string },
  soldeDuHTG: bigint,
  palier: number,
  joursRetard: number
): string {
  // Le ton se durcit avec le palier, sans jamais devenir agressif — JEDCO
  // reste une entreprise qui veut garder ses clients, pas les perdre au
  // premier retard.
  const intro =
    palier >= 30
      ? `Votre facture <strong>${facture.reference}</strong> est en retard de paiement depuis plus d'un mois.`
      : palier >= 15
        ? `Nous n'avons toujours pas reçu le règlement de votre facture <strong>${facture.reference}</strong>, en retard de ${joursRetard} jours.`
        : `Nous vous rappelons que votre facture <strong>${facture.reference}</strong>, échue le ${formatDateFr(facture.dateEcheance)}, reste impayée.`;

  return `<p>Bonjour ${client.nom},</p>
<p>${intro}</p>
<p>Solde restant dû : <strong>${formatHTG(soldeDuHTG)}</strong>.</p>
<p>Merci de régulariser votre situation dans les meilleurs délais, ou de nous contacter si un
paiement partiel a déjà été effectué.</p>
<p>Cordialement,<br/>JEDCO Services S.A.</p>`;
}

export type ResultatRelances = {
  examinees: number;
  envoyees: number;
  echecs: number;
  sansEmail: number;
};

// Idempotente par construction, même principe que marquerFacturesEnRetard et
// genererFacturesRecurrentes : rejouable sans jamais renvoyer un e-mail déjà
// parti pour le même palier, grâce au journal d'audit qui fait office
// d'historique de ce qui a été envoyé.
export async function envoyerRelancesImpayees(maintenant: Date = new Date()): Promise<ResultatRelances> {
  const factures = await prisma.facture.findMany({
    where: { statut: "EN_RETARD", deletedAt: null },
    include: { client: { select: { nom: true, email: true } }, paiements: { select: { montantHTG: true } } },
  });

  if (factures.length === 0) return { examinees: 0, envoyees: 0, echecs: 0, sansEmail: 0 };

  // Une seule requête pour toutes les factures plutôt qu'une par facture dans
  // la boucle : sur un portefeuille de plusieurs centaines de factures en
  // retard, l'écart est celui d'un aller-retour base par facture contre un
  // seul pour le lot entier.
  const dejaEnvoyees = await prisma.auditLog.findMany({
    where: { action: ACTION_RELANCE, entityId: { in: factures.map((f) => f.id) } },
    select: { entityId: true, metadata: true },
  });
  const palierMaxParFacture = new Map<string, number>();
  for (const log of dejaEnvoyees) {
    const palier = (log.metadata as { palier?: unknown } | null)?.palier;
    if (typeof palier !== "number" || !log.entityId) continue;
    const actuel = palierMaxParFacture.get(log.entityId) ?? 0;
    if (palier > actuel) palierMaxParFacture.set(log.entityId, palier);
  }

  let envoyees = 0;
  let echecs = 0;
  let sansEmail = 0;

  for (const facture of factures) {
    const retard = joursDeRetard(facture.dateEcheance, maintenant);
    const dejaEnvoye = palierMaxParFacture.get(facture.id) ?? 0;
    const palierCible = [...PALIERS_RELANCE_JOURS].reverse().find((p) => retard >= p && p > dejaEnvoye);
    if (palierCible === undefined) continue;

    if (!facture.client.email) {
      sansEmail++;
      continue;
    }

    const soldeDuHTG = facture.totalHTG - facture.paiements.reduce((s, p) => s + p.montantHTG, 0n);

    try {
      await envoyerEmailSimple({
        destinataire: facture.client.email,
        sujet: `JEDCO Services — Rappel : facture ${facture.reference} impayée`,
        corpsHtml: corpsRelance(facture, facture.client, soldeDuHTG, palierCible, retard),
      });
      await consignerAudit({
        action: ACTION_RELANCE,
        entityType: "Facture",
        entityId: facture.id,
        metadata: { palier: palierCible, joursRetard: retard },
      });
      envoyees++;
    } catch (err) {
      // Une relance qui échoue (Resend inactif, réseau) ne doit pas
      // interrompre les suivantes ni faire échouer le lot nocturne entier —
      // voir taches-planifiees.ts, qui applique le même principe d'isolation.
      echecs++;
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), factureId: facture.id },
        "échec de l'envoi d'une relance d'impayé"
      );
    }
  }

  return { examinees: factures.length, envoyees, echecs, sansEmail };
}
