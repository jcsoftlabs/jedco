import { genererFacturesRecurrentes } from "@/lib/services/facturation-recurrente";
import { marquerFacturesEnRetard } from "@/lib/services/factures";
import { marquerContratsExpires } from "@/lib/services/contrats";
import { envoyerRelancesImpayees } from "@/lib/services/relances-impayees";
import { envoyerAlertesRenouvellementContrats } from "@/lib/services/alertes-contrats";
import { consignerAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Trois traitements de fond existaient depuis la Phase 0/1 — facturation
// récurrente des contrats (§1.9), passage des factures échues en EN_RETARD,
// clôture des contrats arrivés à terme — écrits, testés… et appelés par
// personne. Sans déclencheur, un contrat MENSUEL n'émet jamais sa facture et
// le total « Impayé » du tableau de bord reste faux, puisque rien ne fait
// basculer une facture au-delà de son échéance.
//
// Ce module est le point d'entrée unique de ces traitements. Il est appelé
// par app/api/cron/taches-quotidiennes (Vercel Cron une fois par nuit, ou
// bouton manuel en Paramètres) et par rien d'autre.

export const ACTION_AUDIT = "taches.executees";

export type ResultatTache = {
  nom: string;
  ok: boolean;
  // Phrase courte affichée telle quelle dans le backoffice — pas un objet à
  // reformater côté UI, pour que le journal d'audit reste lisible à l'œil nu.
  detail: string;
};

export type RapportTaches = {
  declencheur: "cron" | "manuel";
  dureeMs: number;
  taches: ResultatTache[];
};

// Chaque tâche est isolée : si la facturation récurrente échoue (base
// injoignable au mauvais moment, contrat mal formé), les deux autres doivent
// quand même s'exécuter. Un `Promise.all` les aurait toutes abandonnées à la
// première erreur, et un lot nocturne raté est invisible jusqu'à ce qu'un
// client s'étonne de ne pas avoir reçu sa facture.
async function executer(nom: string, travail: () => Promise<string>): Promise<ResultatTache> {
  try {
    return { nom, ok: true, detail: await travail() };
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err), tache: nom }, "tâche planifiée en échec");
    return {
      nom,
      ok: false,
      detail: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

export async function executerTachesQuotidiennes(
  declencheur: "cron" | "manuel" = "cron",
  maintenant: Date = new Date()
): Promise<RapportTaches> {
  const debut = Date.now();

  // Séquentiel et non parallèle : les trois tâches écrivent dans les mêmes
  // tables et passent toutes par PgBouncer. Les enchaîner évite de consommer
  // trois connexions du pool pour un traitement qui n'a aucune contrainte de
  // temps — il tourne à 1 h du matin.
  const taches: ResultatTache[] = [];

  taches.push(
    await executer("Facturation des contrats récurrents", async () => {
      const r = await genererFacturesRecurrentes(maintenant);
      if (r.ignore) return `Période ${r.periode} : déjà en cours d'exécution ailleurs, ignorée`;
      return `Période ${r.periode} : ${r.genere} facture(s) générée(s)`;
    })
  );

  taches.push(
    await executer("Factures échues passées en retard", async () => {
      const n = await marquerFacturesEnRetard(maintenant);
      return `${n} facture(s) marquée(s) EN_RETARD`;
    })
  );

  // Après, et non avant, le passage en EN_RETARD ci-dessus : les relances ne
  // portent que sur les factures déjà marquées, sinon une facture qui vient
  // tout juste de dépasser son échéance ce soir ne serait vue qu'au lot
  // suivant.
  taches.push(
    await executer("Relances d'impayés envoyées", async () => {
      const r = await envoyerRelancesImpayees(maintenant);
      const details = [`${r.envoyees} envoyée(s) sur ${r.examinees} facture(s) en retard`];
      if (r.sansEmail > 0) details.push(`${r.sansEmail} sans e-mail client`);
      if (r.echecs > 0) details.push(`${r.echecs} échec(s) d'envoi`);
      return details.join(", ");
    })
  );

  // Avant, et non après, la clôture des contrats arrivés à terme ci-dessous :
  // les alertes ne portent que sur des contrats encore ACTIF, un contrat déjà
  // basculé en EXPIRE cette nuit n'a plus besoin d'être averti qu'il expire.
  taches.push(
    await executer("Alertes de renouvellement de contrat envoyées", async () => {
      const r = await envoyerAlertesRenouvellementContrats(maintenant);
      const details = [`${r.envoyees} envoyée(s) sur ${r.examines} contrat(s) proche(s) de l'échéance`];
      if (r.echecs > 0) details.push(`${r.echecs} échec(s) d'envoi`);
      return details.join(", ");
    })
  );

  taches.push(
    await executer("Contrats arrivés à terme", async () => {
      const n = await marquerContratsExpires(maintenant);
      return `${n} contrat(s) marqué(s) EXPIRE`;
    })
  );

  const rapport: RapportTaches = { declencheur, dureeMs: Date.now() - debut, taches };

  // Le journal d'audit sert ici de trace d'exécution : c'est lui qu'affiche la
  // page Paramètres pour répondre à « le lot de cette nuit est-il passé ? ».
  // Volontairement hors du try/catch par tâche — si même l'audit échoue, la
  // route doit renvoyer 500 plutôt que prétendre que tout va bien.
  await consignerAudit({
    action: ACTION_AUDIT,
    entityType: "Systeme",
    metadata: rapport,
  });

  logger.info({ rapport }, "tâches quotidiennes exécutées");
  return rapport;
}

// Dernière exécution connue, pour l'encadré de la page Paramètres. Renvoie
// null tant que le lot n'a jamais tourné — ce qui est en soi l'information
// la plus importante à afficher.
export async function derniereExecution(): Promise<{ date: Date; rapport: RapportTaches } | null> {
  const entree = await prisma.auditLog.findFirst({
    where: { action: ACTION_AUDIT },
    orderBy: { createdAt: "desc" },
  });
  if (!entree || !entree.metadata) return null;
  return { date: entree.createdAt, rapport: entree.metadata as unknown as RapportTaches };
}
