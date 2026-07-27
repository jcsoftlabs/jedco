"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type OptionFiltre = { valeur: string; label: string };
export type DefinitionFiltre = { label: string; param: string; options: OptionFiltre[] };

// Équivalent de TableauFiltrable, mais la recherche et le(s) filtre(s)
// pilotent l'URL (searchParams `q` et un paramètre par filtre) au lieu d'un
// état local : le serveur refait la requête sur TOUTE la table, pas
// seulement la page déjà chargée dans le navigateur (voir
// listerClients/listerFactures/… pour la recherche SQL elle-même). Un
// changement remet toujours la pagination à la page 1.
export default function RechercheServeur({
  placeholder,
  filtre,
  filtres,
}: {
  placeholder: string;
  // Un seul menu déroulant — la forme d'origine, conservée pour les pages
  // qui n'ont besoin que d'un filtre (Factures, Devis, Interventions…).
  filtre?: DefinitionFiltre;
  // Plusieurs menus déroulants côte à côte — pour une page comme Clients qui
  // segmente sur plusieurs axes à la fois (zone, type de service, statut de
  // paiement). `filtre` et `filtres` sont fusionnés si les deux sont fournis.
  filtres?: DefinitionFiltre[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const tousLesFiltres: DefinitionFiltre[] = [...(filtre ? [filtre] : []), ...(filtres ?? [])];

  // Le debounce évite une requête serveur à chaque frappe — 300ms est
  // imperceptible pour l'admin mais épargne la base sur une saisie rapide.
  useEffect(() => {
    const minuteur = setTimeout(() => {
      const valeurUrl = searchParams.get("q") ?? "";
      if (q === valeurUrl) return;
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(minuteur);
  }, [q]);

  function changerFiltre(param: string, valeur: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (valeur) params.set(param, valeur);
    else params.delete(param);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const valeursActives = tousLesFiltres.map((f) => searchParams.get(f.param) ?? "");
  const auMoinsUnFiltreActif = valeursActives.some(Boolean);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[220px] flex-1">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-jedco focus:ring-1 focus:ring-jedco/30"
        />
      </div>

      {tousLesFiltres.map((f) => (
        <select
          key={f.param}
          value={searchParams.get(f.param) ?? ""}
          onChange={(e) => changerFiltre(f.param, e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-jedco"
        >
          <option value="">{f.label} : tous</option>
          {f.options.map((o) => (
            <option key={o.valeur} value={o.valeur}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {(q || auMoinsUnFiltreActif) && (
        <button
          onClick={() => {
            setQ("");
            const params = new URLSearchParams(searchParams.toString());
            params.delete("q");
            for (const f of tousLesFiltres) params.delete(f.param);
            params.delete("page");
            router.replace(`${pathname}?${params.toString()}`);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}
