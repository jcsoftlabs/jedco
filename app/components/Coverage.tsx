"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FadeUp from "./FadeUp";
import type { Ville } from "./CoverageMap";

// Leaflet touche `window` dès son import — chargé uniquement côté client,
// jamais lors du rendu serveur, sinon le build échoue.
const CoverageMap = dynamic(() => import("./CoverageMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-400">
      Chargement de la carte…
    </div>
  ),
});

const VILLES: Ville[] = [
  { nom: "Port-au-Prince", lat: 18.5944, lng: -72.3074, description: "Siège social — couverture complète, intervention rapide." },
  { nom: "Cap-Haïtien", lat: 19.7592, lng: -72.2014, description: "Vidange, collecte d'ordures et nettoyage industriel." },
  { nom: "Les Cayes", lat: 18.2010, lng: -73.7500, description: "Vidange de fosses septiques et toilettes mobiles." },
  { nom: "Jacmel", lat: 18.2342, lng: -72.5347, description: "Vidange et collecte d'ordures." },
  { nom: "Saint-Marc", lat: 19.1100, lng: -72.7000, description: "Vidange et nettoyage industriel." },
];

export default function Coverage() {
  const [survole, setSurvole] = useState<string | null>(null);

  // Un clic sur une ville prépare directement la demande de contact : la
  // zone est pré-remplie et le formulaire reçoit le focus — un visiteur qui
  // vient de repérer sa ville sur la carte n'a plus qu'à continuer sa saisie.
  function choisirVille(nom: string) {
    const champZone = document.getElementById("zone") as HTMLInputElement | null;
    if (champZone) champZone.value = nom;
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    champZone?.focus();
  }

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Zones de couverture</h2>
          <p className="mt-3 text-slate-500">
            Présence opérationnelle dans les principaux pôles urbains d&apos;Haïti — cliquez une ville.
          </p>
        </FadeUp>

        <FadeUp className="mt-10 grid gap-8 items-start md:grid-cols-[1fr_260px]">
          <CoverageMap villes={VILLES} survole={survole} onSurvol={setSurvole} onChoisir={choisirVille} />

          {/* Légende — numéros assortis à ceux des marqueurs sur la carte. */}
          <ul className="space-y-2">
            {VILLES.map((v, i) => (
              <li key={v.nom}>
                <button
                  type="button"
                  onMouseEnter={() => setSurvole(v.nom)}
                  onMouseLeave={() => setSurvole(null)}
                  onClick={() => choisirVille(v.nom)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    survole === v.nom
                      ? "border-jedco bg-white shadow-sm"
                      : "border-slate-200 bg-white/60 hover:border-jedco/40"
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-jedco text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-jedco-dark">{v.nom}</span>
                    <span className="block text-xs text-slate-500">{v.description}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </FadeUp>
      </div>
    </section>
  );
}
