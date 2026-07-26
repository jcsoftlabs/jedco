// Découpe une recherche en motifs LIKE (un par mot), pour l'opérateur SQL
// `LIKE ALL(...)` : chaque mot doit apparaître quelque part dans la colonne
// concaténée fournie par l'appelant — même sémantique ET que la recherche
// côté client de TableauFiltrable.tsx, mais évaluée par PostgreSQL sur toute
// la table plutôt que sur la seule page déjà chargée dans le navigateur.
export function motifsRecherche(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((mot) => `%${mot}%`);
}
