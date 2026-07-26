import { prisma } from "@/lib/db";
import { referenceFacture } from "@/lib/codes";
import { tauxUsdCourantEncode } from "@/lib/services/factures";
import type { Contrat } from "@/app/generated/prisma/client";

function periodeCourante(date: Date): string {
  const annee = date.getUTCFullYear();
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${annee}-${mois}`;
}

function moisEcoules(dateDebut: Date, maintenant: Date): number {
  return (
    (maintenant.getUTCFullYear() - dateDebut.getUTCFullYear()) * 12 +
    (maintenant.getUTCMonth() - dateDebut.getUTCMonth())
  );
}

// Un contrat MENSUEL se facture chaque mois, TRIMESTRIEL tous les 3 mois,
// ANNUEL une fois par an — l'échéance se calcule depuis dateDebut, pas depuis
// un compteur externe, pour rester correct même après une interruption
// prolongée du cron (aucun état à part le contrat lui-même).
function doitEtreFacturePourCeMois(contrat: Pick<Contrat, "type" | "dateDebut">, maintenant: Date): boolean {
  const mois = moisEcoules(contrat.dateDebut, maintenant);
  if (mois < 0) return false;
  switch (contrat.type) {
    case "MENSUEL":
      return true;
    case "TRIMESTRIEL":
      return mois % 3 === 0;
    case "ANNUEL":
      return mois % 12 === 0;
    default:
      return false; // PONCTUEL n'est jamais facturé automatiquement
  }
}

export type ResultatFacturationRecurrente = {
  periode: string;
  genere: number;
  ignore: boolean;
};

// Génération mensuelle des factures de contrats récurrents (§1.9). Protégée
// à deux niveaux :
//   1. Verrou consultatif Postgres scopé à la période — si le cron se
//      déclenche deux fois en même temps (déclenchement manuel + programmé,
//      ou double invocation d'une plateforme de cron), la seconde exécution
//      se retire immédiatement sans travailler, au lieu de dupliquer l'effort
//      ou de risquer une erreur de contrainte pour chaque contrat.
//   2. La contrainte unique (contratId, periode) déjà en base (migration
//      Phase 0) reste le filet de sécurité final si le verrou échouait pour
//      une raison quelconque (ex: connexion perdue en cours d'exécution).
export async function genererFacturesRecurrentes(
  maintenant: Date = new Date()
): Promise<ResultatFacturationRecurrente> {
  const periode = periodeCourante(maintenant);
  const cleVerrou = `facturation-recurrente:${periode}`;

  const [{ verrouObtenu }] = await prisma.$queryRaw<{ verrouObtenu: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext(${cleVerrou})) AS "verrouObtenu"
  `;

  if (!verrouObtenu) {
    return { periode, genere: 0, ignore: true };
  }

  try {
    const contratsActifs = await prisma.contrat.findMany({
      where: {
        statut: "ACTIF",
        deletedAt: null,
        type: { in: ["MENSUEL", "TRIMESTRIEL", "ANNUEL"] },
        dateDebut: { lte: maintenant },
        dateFin: { gte: maintenant },
      },
    });

    const contratsEligibles = contratsActifs.filter((c) => doitEtreFacturePourCeMois(c, maintenant));

    let genere = 0;
    for (const contrat of contratsEligibles) {
      const dejaFacture = await prisma.facture.findUnique({
        where: { contratId_periode: { contratId: contrat.id, periode } },
      });
      if (dejaFacture) continue;

      const reference = await referenceFacture();
      const tauxUsdApplique = await tauxUsdCourantEncode();

      await prisma.facture.create({
        data: {
          reference,
          clientId: contrat.clientId,
          contratId: contrat.id,
          periode,
          montantHTG: contrat.montantHTG,
          taxeHTG: 0n,
          totalHTG: contrat.montantHTG,
          tauxUsdApplique,
          dateEcheance: new Date(maintenant.getTime() + 30 * 86_400_000),
          lignes: {
            create: [
              {
                description: `Facturation ${contrat.type.toLowerCase()} — contrat ${contrat.reference} (${periode})`,
                quantite: 1,
                prixUnitaireHTG: contrat.montantHTG,
                totalHTG: contrat.montantHTG,
                ordre: 0,
              },
            ],
          },
        },
      });
      genere++;
    }

    return { periode, genere, ignore: false };
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${cleVerrou}))`;
  }
}
