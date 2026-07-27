"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NouvelleToiletteForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch("/api/toilettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localisationActuelle: fd.get("localisationActuelle") || undefined,
          notes: fd.get("notes") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      form.reset();
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
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light"
      >
        + Nouvelle toilette
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs text-slate-500">
        Le code (TLT-XXX) est attribué automatiquement. La toilette est ajoutée disponible.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Localisation actuelle <span className="font-normal text-slate-400">(optionnel)</span>
          </label>
          <input
            name="localisationActuelle"
            placeholder="Entrepôt Delmas"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>
      </div>
      <textarea
        name="notes"
        rows={2}
        placeholder="Notes (optionnel)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
      />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
        >
          {envoi ? "Création…" : "Créer"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
