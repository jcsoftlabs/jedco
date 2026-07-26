"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NouveauTemoignageForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;

    try {
      const res = await fetch("/api/temoignages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: fd.get("nom"),
          type: fd.get("type"),
          note: Number(fd.get("note")),
          commentaire: fd.get("commentaire"),
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
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        + Nouveau témoignage
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <input name="nom" placeholder="Nom du client" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input
        name="type"
        placeholder='Contexte (ex : "Entreprise — AgroTrans Haiti")'
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Note</label>
        <select name="note" defaultValue="5" className="rounded border border-slate-300 px-3 py-2 text-sm">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="commentaire"
        placeholder="Citation du témoignage"
        rows={3}
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
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
