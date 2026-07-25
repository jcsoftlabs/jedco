"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Formulaire minimal — juste de quoi avoir des véhicules à sélectionner dans
// le formulaire d'intervention. La gestion complète de la flotte (statuts,
// entretien…) est le module Flotte de la Phase 3 du plan, pas ici.
export default function NouveauVehiculeForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch("/api/vehicules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      setOuvert(false);
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition"
      >
        + Véhicule
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 max-w-sm text-sm">
      <input name="immatriculation" placeholder="Immatriculation" required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <input name="marque" placeholder="Marque" required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <input name="modele" placeholder="Modèle" required className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <select name="type" defaultValue="CAMION_ASPIRATEUR" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
        <option value="CAMION_ASPIRATEUR">Camion aspirateur</option>
        <option value="CAMION_COLLECTE">Camion collecte</option>
        <option value="UTILITAIRE">Utilitaire</option>
      </select>
      {erreur && <p className="text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={envoi} className="rounded bg-jedco px-3 py-1.5 text-white disabled:opacity-60">
          {envoi ? "…" : "Créer"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="rounded border border-slate-300 px-3 py-1.5 text-slate-700">
          Annuler
        </button>
      </div>
    </form>
  );
}
