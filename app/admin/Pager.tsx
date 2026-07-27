import Link from "next/link";

const TAILLE_PAGE_DEFAUT = 50;
export { TAILLE_PAGE_DEFAUT };

// Pagination réelle côté serveur — remplace le chargement d'un lot fixe
// (200 lignes) qui rendait tout enregistrement au-delà simplement invisible,
// sans page suivante pour l'atteindre. `searchParams` porte les autres
// filtres actifs (ex. clientId) pour qu'ils survivent au changement de page.
export default function Pager({
  page,
  limit,
  total,
  basePath,
  searchParams = {},
  paramPage = "page",
}: {
  page: number;
  limit: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
  // Nom du paramètre d'URL porté par la pagination — "page" par défaut.
  // Une page qui affiche deux listes paginées indépendamment (ex. Demandes :
  // devis + rendez-vous) a besoin de deux noms distincts, sinon le second
  // Pager écraserait la position du premier au moindre clic.
  paramPage?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;

  function href(p: number): string {
    const params = new URLSearchParams();
    for (const [cle, valeur] of Object.entries(searchParams)) {
      if (valeur) params.set(cle, valeur);
    }
    params.set(paramPage, String(p));
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <p>
        Page {page} sur {totalPages} — {total} au total
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <span className="rounded-lg border border-slate-300 px-3 py-1.5 opacity-40">Précédent</span>
        ) : (
          <Link href={href(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
            Précédent
          </Link>
        )}
        {page >= totalPages ? (
          <span className="rounded-lg border border-slate-300 px-3 py-1.5 opacity-40">Suivant</span>
        ) : (
          <Link href={href(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
            Suivant
          </Link>
        )}
      </div>
    </div>
  );
}
