import { prisma } from "@/lib/db";
import { statsFactures } from "@/lib/services/factures";

function compterParStatut<T extends string>(
  lignes: { statut: T; _count: number }[]
): Record<string, number> {
  return Object.fromEntries(lignes.map((l) => [l.statut, l._count]));
}

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export type PointMensuel = { cle: string; libelle: string; factureHTG: bigint; encaisseHTG: bigint };

// Série mensuelle facturé/encaissé sur les 12 derniers mois glissants — la
// courbe du tableau de bord. Les montants restent en BigInt (centimes)
// jusqu'à l'affichage, jamais convertis en Number ici (§1.7).
//
// Le regroupement se fait en mémoire plutôt qu'en SQL : Prisma ne sait pas
// grouper par troncature de date sans requête brute, et le volume concerné
// (12 mois de factures d'une PME) ne justifie pas d'y descendre.
export async function revenusMensuels(maintenant: Date = new Date()): Promise<PointMensuel[]> {
  const debut = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 11, 1));

  const factures = await prisma.facture.findMany({
    where: { deletedAt: null, dateEmission: { gte: debut } },
    select: { dateEmission: true, totalHTG: true, paiements: { select: { montantHTG: true } } },
  });

  // Les 12 seaux sont créés à vide d'abord : un mois sans aucune facture doit
  // apparaître comme un creux sur la courbe, pas comme un trou qui décale les
  // points suivants.
  const seaux = new Map<string, PointMensuel>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth() + i, 1));
    const cle = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    seaux.set(cle, { cle, libelle: MOIS_COURTS[d.getUTCMonth()], factureHTG: 0n, encaisseHTG: 0n });
  }

  for (const facture of factures) {
    const d = facture.dateEmission;
    const cle = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const seau = seaux.get(cle);
    if (!seau) continue; // hors fenêtre glissante
    seau.factureHTG += facture.totalHTG;
    seau.encaisseHTG += facture.paiements.reduce((s, p) => s + p.montantHTG, 0n);
  }

  return [...seaux.values()];
}

// Agrège des chiffres déjà présents dans plusieurs tables (Facture, Devis,
// Intervention, Vehicule, Technicien, DemandeDevis) en un seul appel pour le
// tableau de bord d'accueil (Phase 5, Pilotage) — aucune nouvelle donnée,
// juste une vue d'ensemble qui évite de naviguer page par page pour se faire
// une idée de l'activité.
export async function statsPilotage(params: { dateDebut?: Date; dateFin?: Date } = {}) {
  const [
    finance,
    serieMensuelle,
    interventionsParStatutBrut,
    vehiculesParStatutBrut,
    techniciens,
    demandesNonTraitees,
    devisParStatutBrut,
    facturesEnRetard,
  ] = await Promise.all([
    statsFactures(params),
    revenusMensuels(),
    prisma.intervention.groupBy({
      by: ["statut"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.vehicule.groupBy({
      by: ["statut"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.technicien.findMany({ where: { deletedAt: null }, select: { disponible: true } }),
    prisma.demandeDevis.count({ where: { traite: false } }),
    prisma.devis.groupBy({
      by: ["statut"],
      where: { deletedAt: null },
      _count: true,
    }),
    prisma.facture.count({ where: { statut: "EN_RETARD", deletedAt: null } }),
  ]);

  const interventionsParStatut = compterParStatut(interventionsParStatutBrut);
  const vehiculesParStatut = compterParStatut(vehiculesParStatutBrut);
  const devisParStatut = compterParStatut(devisParStatutBrut);

  const totalDevisEmis = Object.entries(devisParStatut)
    .filter(([statut]) => statut !== "BROUILLON")
    .reduce((s, [, n]) => s + n, 0);
  const devisConvertis = devisParStatut.CONVERTI ?? 0;

  return {
    finance,
    serieMensuelle,
    interventions: {
      parStatut: interventionsParStatut,
      actives:
        (interventionsParStatut.EN_ATTENTE ?? 0) +
        (interventionsParStatut.PLANIFIE ?? 0) +
        (interventionsParStatut.EN_COURS ?? 0),
      total: Object.values(interventionsParStatut).reduce((s, n) => s + n, 0),
    },
    vehicules: {
      parStatut: vehiculesParStatut,
      disponibles: vehiculesParStatut.DISPONIBLE ?? 0,
      enMaintenance: vehiculesParStatut.EN_MAINTENANCE ?? 0,
      total: Object.values(vehiculesParStatut).reduce((s, n) => s + n, 0),
    },
    techniciens: {
      disponibles: techniciens.filter((t) => t.disponible).length,
      total: techniciens.length,
    },
    commercial: {
      demandesNonTraitees,
      devisParStatut,
      // Part des devis réellement émis (hors brouillons jamais envoyés) qui
      // ont abouti à une facture — indicateur direct du pipeline
      // Demande → Devis → Facture construit en Phase 4.
      tauxConversionPourcent: totalDevisEmis > 0 ? Math.round((devisConvertis / totalDevisEmis) * 100) : null,
    },
    alertes: {
      facturesEnRetard,
      demandesNonTraitees,
      vehiculesEnMaintenance: vehiculesParStatut.EN_MAINTENANCE ?? 0,
    },
  };
}
