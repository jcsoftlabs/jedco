"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OptionType = { code: string; libelle: string };

export default function NouvelArticleForm({ typesService }: { typesService: OptionType[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [prixSuggereHTG, setPrixSuggereHTG] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom,
          type: type || undefined,
          prixSuggereHTG: prixSuggereHTG ? Number(prixSuggereHTG) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      setNom("");
      setType("");
      setPrixSuggereHTG("");
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
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        + Ajouter un article
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <input
        required
        placeholder="Nom du service ou produit"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
        >
          <option value="">Type (optionnel)</option>
          {typesService.map((t) => (
            <option key={t.code} value={t.code}>
              {t.libelle}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Prix suggéré (HTG, optionnel)"
          value={prixSuggereHTG}
          onChange={(e) => setPrixSuggereHTG(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
        />
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "…" : "Ajouter"}
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
