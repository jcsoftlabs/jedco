// Libellés partagés entre la table (composant client) et la fiche véhicule
// (composant serveur).
//
// Ils vivent dans un module SANS "use client" : quand un composant serveur
// importe depuis un module client, Next.js remplace l'import par une
// référence client — les exports qui ne sont pas des composants (ici de
// simples objets) arrivent alors indéfinis côté serveur. La fiche affichait
// pour cette raison « CAMION_ASPIRATEUR » brut au lieu de « Camion
// aspirateur », alors que la table, elle, affichait le bon libellé.
export const LIBELLE_TYPE: Record<string, string> = {
  CAMION_ASPIRATEUR: "Camion aspirateur",
  CAMION_COLLECTE: "Camion de collecte",
  UTILITAIRE: "Utilitaire",
};

export const LIBELLE_STATUT: Record<string, string> = {
  DISPONIBLE: "Disponible",
  EN_SERVICE: "En service",
  EN_MAINTENANCE: "En maintenance",
  HORS_SERVICE: "Hors service",
};

export const COULEUR_STATUT: Record<string, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-700",
  EN_SERVICE: "bg-blue-100 text-blue-700",
  EN_MAINTENANCE: "bg-amber-100 text-amber-700",
  HORS_SERVICE: "bg-slate-200 text-slate-600",
};

export const LIBELLE_ENTRETIEN: Record<string, string> = {
  VIDANGE_MOTEUR: "Vidange moteur",
  REVISION: "Révision",
  REPARATION: "Réparation",
  PNEUS: "Pneus",
  CARROSSERIE: "Carrosserie",
  AUTRE: "Autre",
};
