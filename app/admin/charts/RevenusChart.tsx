"use client";

import { useState } from "react";

// Palette validée avec scripts/validate_palette.js (skill dataviz) : slots
// catégoriels 1 et 2, tous les contrôles au vert en clair comme en sombre
// (séparation CVD ΔE 24.7 protan, contraste ≥ 3:1 sur les deux surfaces).
const SERIE_FACTURE = "#2a78d6";
const SERIE_ENCAISSE = "#eb6834";

const LARGEUR = 720;
const HAUTEUR = 260;
const MARGE = { haut: 16, droite: 16, bas: 28, gauche: 64 };
const LARGEUR_TRACE = LARGEUR - MARGE.gauche - MARGE.droite;
const HAUTEUR_TRACE = HAUTEUR - MARGE.haut - MARGE.bas;

export type PointGraphe = { libelle: string; facture: number; encaisse: number };

function formatCourtHTG(valeurHTG: number): string {
  if (valeurHTG >= 1_000_000) return `${(valeurHTG / 1_000_000).toFixed(1).replace(".0", "")} M`;
  if (valeurHTG >= 1_000) return `${Math.round(valeurHTG / 1_000)} k`;
  return String(Math.round(valeurHTG));
}

function formatCompletHTG(valeurHTG: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(valeurHTG)} HTG`;
}

// Bornes "rondes" pour l'axe Y — un maximum brut (ex. 148 237) produit des
// graduations illisibles ; on arrondit au multiple supérieur d'une puissance
// de 10 adaptée à l'ordre de grandeur.
function bornesArrondies(max: number): { max: number; graduations: number[] } {
  if (max <= 0) return { max: 1, graduations: [0, 1] };
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  const pas = magnitude / 2;
  const maxArrondi = Math.ceil(max / pas) * pas;
  const nb = Math.min(4, Math.max(2, Math.round(maxArrondi / pas)));
  const graduations = Array.from({ length: nb + 1 }, (_, i) => (maxArrondi / nb) * i);
  return { max: maxArrondi, graduations };
}

export default function RevenusChart({ points }: { points: PointGraphe[] }) {
  const [indexActif, setIndexActif] = useState<number | null>(null);

  const maxBrut = Math.max(...points.map((p) => Math.max(p.facture, p.encaisse)), 0);
  const { max, graduations } = bornesArrondies(maxBrut);

  const x = (i: number) => MARGE.gauche + (points.length <= 1 ? LARGEUR_TRACE / 2 : (LARGEUR_TRACE / (points.length - 1)) * i);
  const y = (v: number) => MARGE.haut + HAUTEUR_TRACE - (v / max) * HAUTEUR_TRACE;

  const ligne = (cle: "facture" | "encaisse") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p[cle]).toFixed(1)}`).join(" ");

  const aire = `${ligne("facture")} L ${x(points.length - 1).toFixed(1)} ${(MARGE.haut + HAUTEUR_TRACE).toFixed(1)} L ${x(0).toFixed(1)} ${(MARGE.haut + HAUTEUR_TRACE).toFixed(1)} Z`;

  const actif = indexActif !== null ? points[indexActif] : null;

  return (
    <div className="relative">
      {/* Légende — obligatoire dès 2 séries : l'identité ne doit jamais
          reposer sur la seule couleur. Le texte reste en encre neutre, la
          pastille colorée à côté porte l'identité. */}
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIE_FACTURE }} />
          Facturé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIE_ENCAISSE }} />
          Encaissé
        </span>
      </div>

      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="w-full"
        role="img"
        aria-label="Évolution du montant facturé et encaissé sur les 12 derniers mois"
        onMouseLeave={() => setIndexActif(null)}
      >
        <defs>
          <linearGradient id="degradeFacture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIE_FACTURE} stopOpacity="0.18" />
            <stop offset="100%" stopColor={SERIE_FACTURE} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grille et axes récessifs — présents pour la lecture, jamais
            concurrents des données. */}
        {graduations.map((g) => (
          <g key={g}>
            <line
              x1={MARGE.gauche}
              y1={y(g)}
              x2={MARGE.gauche + LARGEUR_TRACE}
              y2={y(g)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={MARGE.gauche - 10} y={y(g) + 4} textAnchor="end" className="fill-slate-400" fontSize="11">
              {formatCourtHTG(g)}
            </text>
          </g>
        ))}

        <path d={aire} fill="url(#degradeFacture)" />
        <path d={ligne("facture")} fill="none" stroke={SERIE_FACTURE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={ligne("encaisse")} fill="none" stroke={SERIE_ENCAISSE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <text key={p.libelle + i} x={x(i)} y={HAUTEUR - 8} textAnchor="middle" className="fill-slate-400" fontSize="11">
            {p.libelle}
          </text>
        ))}

        {/* Repère vertical + marqueurs du point survolé. */}
        {indexActif !== null && (
          <g>
            <line
              x1={x(indexActif)}
              y1={MARGE.haut}
              x2={x(indexActif)}
              y2={MARGE.haut + HAUTEUR_TRACE}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {/* Anneau de surface 2px sur les marques superposées, pour que les
                deux séries restent distinctes quand elles se croisent. */}
            <circle cx={x(indexActif)} cy={y(points[indexActif].facture)} r="5" fill={SERIE_FACTURE} stroke="#ffffff" strokeWidth="2" />
            <circle cx={x(indexActif)} cy={y(points[indexActif].encaisse)} r="5" fill={SERIE_ENCAISSE} stroke="#ffffff" strokeWidth="2" />
          </g>
        )}

        {/* Zones de survol larges — la cible est bien plus grande que la
            marque, pour rester atteignable au doigt comme à la souris. */}
        {points.map((p, i) => (
          <rect
            key={`survol-${p.libelle}-${i}`}
            x={x(i) - LARGEUR_TRACE / points.length / 2}
            y={MARGE.haut}
            width={LARGEUR_TRACE / points.length}
            height={HAUTEUR_TRACE}
            fill="transparent"
            onMouseEnter={() => setIndexActif(i)}
          />
        ))}
      </svg>

      {actif && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
          <p className="font-semibold text-slate-700">{actif.libelle}</p>
          <p className="mt-1 flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIE_FACTURE }} />
            Facturé : {formatCompletHTG(actif.facture)}
          </p>
          <p className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: SERIE_ENCAISSE }} />
            Encaissé : {formatCompletHTG(actif.encaisse)}
          </p>
        </div>
      )}
    </div>
  );
}
