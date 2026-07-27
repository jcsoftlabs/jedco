import { prisma } from "@/lib/db";
import { envoyerEmailSimple } from "@/lib/email";
import { formatHTG } from "@/lib/money";
import { consignerAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

// Symétrique de relances-impayees.ts, mais côté échéance à venir plutôt que
// dépassée : le client (et l'équipe JEDCO) doit savoir qu'un contrat arrive
// à terme avant qu'il n'expire, pas après.
export const ACTION_ALERTE_RENOUVELLEMENT = "contrat.alerte-renouvellement-envoyee";

// Ordre croissant = du moins urgent au plus urgent. On n'envoie jamais
// qu'UNE alerte par exécution, la plus urgente atteinte et pas encore
// envoyée — si le lot a manqué plusieurs nuits et qu'un contrat passe
// directement sous la barre des 7 jours, on saute l'alerte à 30 et à 15
// jours plutôt que d'envoyer trois e-mails d'un coup.
export const PALIERS_ALERTE_JOURS = [7, 15, 30] as const;

// Seuls les contrats reconductibles ont un sens ici — un PONCTUEL n'est pas
// renouvelable (voir renouvelerContrat, qui le refuse explicitement).
const TYPES_RECONDUCTIBLES = ["MENSUEL", "TRIMESTRIEL", "ANNUEL"] as const;

function joursRestants(dateFin: Date, maintenant: Date): number {
  return Math.ceil((dateFin.getTime() - maintenant.getTime()) / 86_400_000);
}

function formatDateFr(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function corpsAlerte(
  contrat: { reference: string; type: string; montantHTG: bigint; dateFin: Date; renouvellementAuto: boolean },
  client: { nom: string },
  joursRestants: number,
  destinataireInterne: boolean
): string {
  const echeance = formatDateFr(contrat.dateFin);
  if (destinataireInterne) {
    return `<p>Le contrat <strong>${contrat.reference}</strong> (${client.nom}, ${contrat.type.toLowerCase()},
${formatHTG(contrat.montantHTG)}) arrive à échéance le <strong>${echeance}</strong> — dans ${joursRestants} jour(s).</p>
<p>${
      contrat.renouvellementAuto
        ? "Renouvellement automatique activé sur ce contrat."
        : "Renouvellement automatique désactivé — une action manuelle sera nécessaire."
    }</p>
<p>À traiter dans le backoffice, section Contrats.</p>`;
  }
  return `<p>Bonjour ${client.nom},</p>
<p>Votre contrat <strong>${contrat.reference}</strong> avec JEDCO Services arrive à échéance le
<strong>${echeance}</strong> (dans ${joursRestants} jour${joursRestants > 1 ? "s" : ""}).</p>
<p>${
    contrat.renouvellementAuto
      ? "Ce contrat est configuré en renouvellement automatique — aucune action de votre part n'est requise."
      : "N'hésitez pas à nous contacter pour le renouveler."
  }</p>
<p>Cordialement,<br/>JEDCO Services S.A.</p>`;
}

export type ResultatAlertesContrats = {
  examines: number;
  envoyees: number;
  echecs: number;
};

// Idempotente, même principe que envoyerRelancesImpayees : rejouable sans
// jamais renvoyer une alerte déjà partie pour le même palier.
export async function envoyerAlertesRenouvellementContrats(
  maintenant: Date = new Date()
): Promise<ResultatAlertesContrats> {
  const dansTrenteJours = new Date(maintenant.getTime() + 30 * 86_400_000);

  const contrats = await prisma.contrat.findMany({
    where: {
      statut: "ACTIF",
      deletedAt: null,
      type: { in: [...TYPES_RECONDUCTIBLES] },
      dateFin: { gte: maintenant, lte: dansTrenteJours },
    },
    include: { client: { select: { nom: true, email: true } } },
  });

  if (contrats.length === 0) return { examines: 0, envoyees: 0, echecs: 0 };

  const dejaEnvoyees = await prisma.auditLog.findMany({
    where: { action: ACTION_ALERTE_RENOUVELLEMENT, entityId: { in: contrats.map((c) => c.id) } },
    select: { entityId: true, metadata: true },
  });
  const palierMinParContrat = new Map<string, number>();
  for (const log of dejaEnvoyees) {
    const palier = (log.metadata as { palier?: unknown } | null)?.palier;
    if (typeof palier !== "number" || !log.entityId) continue;
    const actuel = palierMinParContrat.get(log.entityId) ?? Infinity;
    if (palier < actuel) palierMinParContrat.set(log.entityId, palier);
  }

  let envoyees = 0;
  let echecs = 0;

  for (const contrat of contrats) {
    const restants = joursRestants(contrat.dateFin, maintenant);
    const dejaEnvoye = palierMinParContrat.get(contrat.id) ?? Infinity;
    const palierCible = PALIERS_ALERTE_JOURS.find((p) => restants <= p && p < dejaEnvoye);
    if (palierCible === undefined) continue;

    // Les deux envois (équipe interne, client) sont indépendants l'un de
    // l'autre : l'échec de l'un ne doit ni empêcher l'autre, ni faire
    // renvoyer le lendemain celui qui a déjà réussi — d'où deux try/catch
    // séparés plutôt qu'un seul englobant les deux appels.
    let auMoinsUnEnvoiReussi = false;

    if (env.NOTIFICATIONS_EMAIL) {
      try {
        await envoyerEmailSimple({
          destinataire: env.NOTIFICATIONS_EMAIL,
          sujet: `Contrat ${contrat.reference} — échéance dans ${restants} jour(s)`,
          corpsHtml: corpsAlerte(contrat, contrat.client, restants, true),
        });
        auMoinsUnEnvoiReussi = true;
      } catch (err) {
        echecs++;
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), contratId: contrat.id },
          "échec de l'alerte de renouvellement à l'équipe JEDCO"
        );
      }
    }

    if (contrat.client.email) {
      try {
        await envoyerEmailSimple({
          destinataire: contrat.client.email,
          sujet: `JEDCO Services — Votre contrat ${contrat.reference} arrive à échéance`,
          corpsHtml: corpsAlerte(contrat, contrat.client, restants, false),
        });
        auMoinsUnEnvoiReussi = true;
      } catch (err) {
        echecs++;
        logger.warn(
          { err: err instanceof Error ? err.message : String(err), contratId: contrat.id },
          "échec de l'alerte de renouvellement au client"
        );
      }
    }

    if (auMoinsUnEnvoiReussi) {
      await consignerAudit({
        action: ACTION_ALERTE_RENOUVELLEMENT,
        entityType: "Contrat",
        entityId: contrat.id,
        metadata: { palier: palierCible, joursRestants: restants },
      });
      envoyees++;
    }
  }

  return { examines: contrats.length, envoyees, echecs };
}
