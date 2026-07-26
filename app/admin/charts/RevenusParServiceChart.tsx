"use client";

import { useState } from "react";

// Rampe séquentielle bleue (une seule teinte, clair → foncé) validée en mode
// ordinal avec scripts/validate_palette.js : monotonie de luminosité, écarts
// de pas ≥ 0.06, extrémité claire à 2.06:1 sur surface claire.
//
// La longueur de la barre porte déjà la magnitude ; la rampe la redouble
// visuellement sans jamais être la seule information.
const RAMPE = ["#0d366b", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef"];
const GRIS_AUTRE = "#94a3b8";

export type PartService = { service: string; montantHTG: number };

function formatCompletHTG(valeurHTG: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(valeurHTG)} HTG`;
}

export default function RevenusParServiceChart({
  parts,
  libellesService,
}: {
  parts: PartService[];
  /** code → libellé, issu de la table de référence TypeService. */
  libellesService: Record<string, string>;
}) {
  const [actif, setActif] = useState<string | null>(null);

  if (parts.length === 0) {
    return <p className="text-sm text-slate-400">Aucun revenu enregistré pour l&apos;instant.</p>;
  }

  const tries = [...parts].sort((a, b) => b.montantHTG - a.montantHTG);

  // Au-delà de 5 tranches la rampe n'a plus d'écarts de pas lisibles : le
  // reliquat est replié dans « Autres services » en gris de mise en retrait,
  // jamais dans une 6ᵉ teinte générée.
  const visibles = tries.slice(0, RAMPE.length);
  const reste = tries.slice(RAMPE.length);
  const lignes =
    reste.length > 0
      ? [
          ...visibles,
          { service: "__autres__", montantHTG: reste.reduce((s, p) => s + p.montantHTG, 0) },
        ]
      : visibles;

  const max = Math.max(...lignes.map((l) => l.montantHTG), 1);

  return (
    <div className="space-y-2.5">
      {lignes.map((ligne, i) => {
        const estAutres = ligne.service === "__autres__";
        const libelle = estAutres
          ? `Autres services (${reste.length})`
          : libellesService[ligne.service] ?? ligne.service;
        const couleur = estAutres ? GRIS_AUTRE : RAMPE[i];
        const pourcent = (ligne.montantHTG / max) * 100;

        return (
          <div
            key={ligne.service}
            onMouseEnter={() => setActif(ligne.service)}
            onMouseLeave={() => setActif(null)}
          >
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className={`truncate ${actif === ligne.service ? "text-slate-900" : "text-slate-600"}`}>
                {libelle}
              </span>
              {/* Étiquette directe : la valeur est toujours lisible, sans
                  dépendre du survol ni de la couleur. */}
              <span className="shrink-0 font-medium tabular-nums text-slate-700">
                {formatCompletHTG(ligne.montantHTG)}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(pourcent, 1.5)}%`, background: couleur }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
