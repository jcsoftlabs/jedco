"use client";

import { useSearchParams } from "next/navigation";

// Reprend les filtres actifs de la page (recherche, statut) pour que l'export
// corresponde exactement à ce que l'admin voit à l'écran — un export
// "tout" quand une recherche est active serait trompeur.
export default function ExporterCsvLien() {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  const q = searchParams.get("q");
  const statut = searchParams.get("statut");
  if (q) params.set("search", q);
  if (statut) params.set("statut", statut);

  return (
    <a
      href={`/api/factures/export?${params.toString()}`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      Exporter en CSV
    </a>
  );
}
