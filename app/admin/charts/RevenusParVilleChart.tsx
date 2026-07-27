"use client";

import { useState } from "react";

// Même rampe que RevenusParServiceChart — cohérence visuelle entre les deux
// cartes du tableau de bord, qui affichent la même grandeur (revenus HTG)
// selon deux axes différents.
const RAMPE = ["#0d366b", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef"];
const GRIS_AUTRE = "#94a3b8";

export type PartVille = { ville: string; montantHTG: number };

function formatCompletHTG(valeurHTG: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(valeurHTG)} HTG`;
}

export default function RevenusParVilleChart({ parts }: { parts: PartVille[] }) {
  const [actif, setActif] = useState<string | null>(null);

  if (parts.length === 0) {
    return <p className="text-sm text-slate-400">Aucun revenu enregistré pour l&apos;instant.</p>;
  }

  const tries = [...parts].sort((a, b) => b.montantHTG - a.montantHTG);

  // Au-delà de 5 tranches la rampe n'a plus d'écarts de pas lisibles : le
  // reliquat est replié dans « Autres villes » en gris de mise en retrait,
  // jamais dans une 6ᵉ teinte générée.
  const visibles = tries.slice(0, RAMPE.length);
  const reste = tries.slice(RAMPE.length);
  const lignes =
    reste.length > 0
      ? [...visibles, { ville: "__autres__", montantHTG: reste.reduce((s, p) => s + p.montantHTG, 0) }]
      : visibles;

  const max = Math.max(...lignes.map((l) => l.montantHTG), 1);

  return (
    <div className="space-y-2.5">
      {lignes.map((ligne, i) => {
        const estAutres = ligne.ville === "__autres__";
        const libelle = estAutres ? `Autres villes (${reste.length})` : ligne.ville;
        const couleur = estAutres ? GRIS_AUTRE : RAMPE[i];
        const pourcent = (ligne.montantHTG / max) * 100;

        return (
          <div key={ligne.ville} onMouseEnter={() => setActif(ligne.ville)} onMouseLeave={() => setActif(null)}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className={`truncate ${actif === ligne.ville ? "text-slate-900" : "text-slate-600"}`}>
                {libelle}
              </span>
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
