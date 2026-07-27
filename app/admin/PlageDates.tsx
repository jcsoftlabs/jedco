"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Filtre par intervalle de dates — pilote l'URL (dateDebut, dateFin) comme
// RechercheServeur pilote q/statut, pour que la même paire de paramètres
// serve à la fois à la page (pagination serveur) et aux liens d'export
// CSV/PDF sans dupliquer la logique de filtrage. Partagé entre Facturation
// et Rapports.
export default function PlageDates() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateDebut = searchParams.get("dateDebut") ?? "";
  const dateFin = searchParams.get("dateFin") ?? "";

  function changer(param: string, valeur: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valeur) params.set(param, valeur);
    else params.delete(param);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-500">
        Du
        <input
          type="date"
          value={dateDebut}
          onChange={(e) => changer("dateDebut", e.target.value)}
          className="ml-1.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-jedco"
        />
      </label>
      <label className="text-sm text-slate-500">
        au
        <input
          type="date"
          value={dateFin}
          onChange={(e) => changer("dateFin", e.target.value)}
          className="ml-1.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm outline-none focus:border-jedco"
        />
      </label>
      {(dateDebut || dateFin) && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("dateDebut");
            params.delete("dateFin");
            params.delete("page");
            router.replace(`${pathname}?${params.toString()}`);
          }}
          className="text-xs text-slate-500 underline"
        >
          Effacer
        </button>
      )}
    </div>
  );
}
