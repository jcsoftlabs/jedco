"use client";

import { useState } from "react";
import FadeUp from "./FadeUp";

type Ville = {
  nom: string;
  x: number;
  y: number;
  description: string;
};

// Coordonnées approximatives dans le viewBox 400x300, dérivées des
// longitudes/latitudes réelles projetées linéairement sur la zone couverte
// par Haïti (lon -74.5..-71.6, lat 18.0..20.1) — une carte stylisée, pas un
// export cartographique précis, mais la position relative des villes entre
// elles est correcte.
const VILLES: Ville[] = [
  { nom: "Port-au-Prince", x: 302, y: 215, description: "Siège social — couverture complète, intervention rapide." },
  { nom: "Cap-Haïtien", x: 317, y: 49, description: "Vidange, collecte d'ordures et nettoyage industriel." },
  { nom: "Les Cayes", x: 103, y: 271, description: "Vidange de fosses septiques et toilettes mobiles." },
  { nom: "Jacmel", x: 271, y: 266, description: "Vidange et collecte d'ordures." },
  { nom: "Saint-Marc", x: 248, y: 141, description: "Vidange et nettoyage industriel." },
];

// Silhouette stylisée d'Haïti — la forme reconnaissable à deux presqu'îles
// autour du Golfe de la Gonâve, dessinée à la main pour rester dans le style
// vectoriel plat du reste du site plutôt qu'un import cartographique externe.
const SILHOUETTE =
  "M 330,50 C 350,55 368,65 375,80 C 382,105 386,130 385,150 C 384,175 375,195 365,210 " +
  "C 355,228 342,242 330,250 C 305,262 285,270 270,275 C 245,278 220,276 200,270 " +
  "C 170,266 150,265 130,266 C 105,268 100,272 90,272 C 65,270 55,265 50,260 " +
  "C 30,248 18,235 15,225 C 13,213 18,203 25,195 C 35,183 50,177 70,175 " +
  "C 95,172 115,171 130,170 C 150,169 170,172 190,175 C 205,178 200,190 210,195 " +
  "C 230,205 245,208 260,215 C 275,220 290,218 300,215 C 310,205 302,190 298,180 " +
  "C 292,165 275,152 260,142 C 245,132 225,130 210,130 C 190,130 165,125 145,120 " +
  "C 100,110 65,102 60,100 C 55,90 48,80 45,65 C 55,55 75,50 95,48 " +
  "C 120,45 145,42 170,42 C 200,41 225,44 245,50 C 260,54 262,60 260,90 " +
  "C 265,75 285,63 300,58 C 310,55 320,52 330,50 Z";

export default function Coverage() {
  const [active, setActive] = useState<string | null>(null);

  // Un clic sur une ville prépare directement la demande de contact : la
  // zone est pré-remplie et le formulaire reçoit le focus — un visiteur qui
  // vient de repérer sa ville sur la carte n'a plus qu'à continuer sa saisie.
  function choisirVille(nom: string) {
    setActive(nom);
    const champZone = document.getElementById("zone") as HTMLInputElement | null;
    if (champZone) champZone.value = nom;
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    champZone?.focus();
  }

  const villeActive = VILLES.find((v) => v.nom === active);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Zones de couverture</h2>
          <p className="mt-3 text-slate-500">
            Présence opérationnelle dans les principaux pôles urbains d&apos;Haïti — cliquez une ville.
          </p>
        </FadeUp>

        <FadeUp className="mt-10 grid gap-8 items-center md:grid-cols-[1fr_240px]">
          <div className="relative mx-auto w-full max-w-md md:max-w-none">
            <svg
              viewBox="0 0 400 300"
              className="h-auto w-full"
              role="img"
              aria-label="Carte d'Haïti avec les cinq villes desservies par JEDCO"
            >
              <title>Carte des zones de couverture JEDCO</title>
              <path d={SILHOUETTE} fill="#1A4F8A" fillOpacity="0.12" stroke="#1A4F8A" strokeWidth="2" strokeLinejoin="round" />

              {VILLES.map((v) => {
                const estActive = active === v.nom;
                return (
                  <g
                    key={v.nom}
                    onMouseEnter={() => setActive(v.nom)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(v.nom)}
                    onBlur={() => setActive(null)}
                    onClick={() => choisirVille(v.nom)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        choisirVille(v.nom);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${v.nom} — ${v.description}`}
                    className="cursor-pointer outline-none"
                  >
                    {/* Cercle invisible qui élargit la zone cliquable/survolable bien
                        au-delà du point visible (r=6) — sur un viewBox mis à l'échelle,
                        6 unités SVG donnent une cible tactile bien trop petite pour un
                        doigt sur mobile. */}
                    <circle cx={v.x} cy={v.y} r="16" fill="transparent" />
                    {estActive && <circle cx={v.x} cy={v.y} r="13" fill="#1A4F8A" fillOpacity="0.35" className="animate-ping" />}
                    <circle cx={v.x} cy={v.y} r="6" fill="#1A4F8A" stroke="white" strokeWidth="2" />
                    {estActive && (
                      <g>
                        <rect
                          x={v.x - v.nom.length * 3.6 - 8}
                          y={v.y - 30}
                          width={v.nom.length * 7.2 + 16}
                          height="18"
                          rx="4"
                          fill="#0F2F52"
                        />
                        <text
                          x={v.x}
                          y={v.y - 17}
                          textAnchor="middle"
                          fill="white"
                          style={{ fontSize: 11, fontWeight: 600 }}
                        >
                          {v.nom}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="space-y-2">
            {VILLES.map((v) => (
              <button
                key={v.nom}
                type="button"
                onMouseEnter={() => setActive(v.nom)}
                onMouseLeave={() => setActive(null)}
                onClick={() => choisirVille(v.nom)}
                className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition ${
                  active === v.nom
                    ? "border-jedco bg-white text-jedco shadow-sm"
                    : "border-slate-200 bg-white/60 text-jedco-dark hover:border-jedco/40"
                }`}
              >
                {v.nom}
              </button>
            ))}
          </div>
        </FadeUp>

        <p className="mt-6 min-h-[1.25rem] text-center text-sm text-slate-500">
          {villeActive?.description ?? " "}
        </p>
      </div>
    </section>
  );
}
