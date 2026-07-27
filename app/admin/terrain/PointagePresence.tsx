"use client";

import { useEffect, useState } from "react";

type Presence = { present: boolean; notes: string | null } | null;

// Widget de pointage journalier, affiché uniquement pour un compte
// TECHNICIEN (voir terrain/page.tsx) : le pointage n'a de sens que pour la
// personne qui pointe pour elle-même.
export default function PointagePresence() {
  const [presence, setPresence] = useState<Presence>(null);
  const [charge, setCharge] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    try {
      const res = await fetch("/api/presences/moi");
      const data = await res.json();
      if (data.success) setPresence(data.data);
    } finally {
      setCharge(false);
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function pointer(present: boolean) {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/presences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ present }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setPresence(data.data);
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  if (charge) return null;

  const aujourdhui = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Présence — {aujourdhui}</p>
      {presence ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-sm font-medium ${
              presence.present ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {presence.present ? "Présent aujourd'hui" : "Absent aujourd'hui"}
          </span>
          <button
            onClick={() => pointer(!presence.present)}
            disabled={envoi}
            className="text-xs font-medium text-jedco hover:underline disabled:opacity-50"
          >
            Corriger
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => pointer(true)}
            disabled={envoi}
            className="flex-1 rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
          >
            Je suis présent
          </button>
          <button
            onClick={() => pointer(false)}
            disabled={envoi}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Je suis absent
          </button>
        </div>
      )}
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
