"use client";

import { useMemo, useState } from "react";

export type ColonneFiltre = { valeur: string; label: string };

// Recherche + filtre côté client, sur les lignes déjà chargées.
//
// Choix assumé : les pages admin chargent au plus 50–200 lignes (plafond de
// pagination §1.19), donc filtrer en mémoire répond instantanément sans
// aller-retour serveur. Le jour où une table dépassera ce volume, c'est la
// pagination qu'il faudra revoir — pas ce composant.
export default function TableauFiltrable<T>({
  lignes,
  texteDe,
  filtres,
  valeurFiltreDe,
  placeholder = "Rechercher…",
  children,
}: {
  lignes: T[];
  /** Toutes les valeurs sur lesquelles la recherche doit porter pour une ligne. */
  texteDe: (ligne: T) => (string | null | undefined)[];
  /** Options du filtre déroulant (statut, type…). Omis = pas de filtre. */
  filtres?: { label: string; options: ColonneFiltre[] };
  valeurFiltreDe?: (ligne: T) => string;
  placeholder?: string;
  children: (lignesFiltrees: T[]) => React.ReactNode;
}) {
  const [recherche, setRecherche] = useState("");
  const [filtreActif, setFiltreActif] = useState("");

  const lignesFiltrees = useMemo(() => {
    // Normalisation sans accents : « Pétion » doit se trouver en tapant
    // « petion », cas courant sur un clavier sans accents.
    //
    // La plage des diacritiques combinants est écrite en séquences
    // d'échappement (\u0300-\u036f) et non en caractères littéraux : ces
    // codepoints sont invisibles dans le source et un outil d'édition peut les
    // normaliser silencieusement, ce qui rendrait le remplacement inopérant —
    // c'est déjà arrivé sur lib/pdf.ts.
    const normaliser = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const termes = normaliser(recherche.trim()).split(/\s+/).filter(Boolean);

    return lignes.filter((ligne) => {
      if (filtreActif && valeurFiltreDe && valeurFiltreDe(ligne) !== filtreActif) return false;
      if (termes.length === 0) return true;

      const foin = normaliser(texteDe(ligne).filter(Boolean).join(" "));
      // Tous les termes doivent matcher (ET), pour qu'ajouter un mot
      // restreigne la recherche au lieu de l'élargir.
      return termes.every((t) => foin.includes(t));
    });
  }, [lignes, recherche, filtreActif, texteDe, valeurFiltreDe]);

  return (
    <div>
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
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-jedco focus:ring-1 focus:ring-jedco/30"
          />
        </div>

        {filtres && (
          <select
            value={filtreActif}
            onChange={(e) => setFiltreActif(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-jedco"
          >
            <option value="">{filtres.label} : tous</option>
            {filtres.options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.label}
              </option>
            ))}
          </select>
        )}

        {(recherche || filtreActif) && (
          <button
            onClick={() => {
              setRecherche("");
              setFiltreActif("");
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Réinitialiser
          </button>
        )}

        <span className="text-sm text-slate-400">
          {lignesFiltrees.length} / {lignes.length}
        </span>
      </div>

      {children(lignesFiltrees)}
    </div>
  );
}
