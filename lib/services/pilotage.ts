import { prisma } from "@/lib/db";
import { statsFactures } from "@/lib/services/factures";

function compterParStatut<T extends string>(
  lignes: { statut: T; _count: number }[]
): Record<string, number> {
  return Object.fromEntries(lignes.map((l) => [l.statut, l._count]));
}

// Agrège des chiffres déjà présents dans plusieurs tables (Facture, Devis,
// Intervention, Vehicule, Technicien, DemandeDevis) en un seul appel pour le
// tableau de bord d'accueil (Phase 5, Pilotage) — aucune nouvelle donnée,
// juste une vue d'ensemble qui évite de naviguer page par page pour se faire
// une idée de l'activité.
export async function statsPilotage(params: { dateDebut?: Date; dateFin?: Date } = {}) {
  const [
    finance,
    interventionsParStatutBrut,
    vehiculesParStatutBrut,
    techniciens,
    demandesNonTraitees,
    devisParStatutBrut,
    facturesEnRetard,
  ] = await Promise.all([
    statsFactures(params),
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
