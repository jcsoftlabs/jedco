"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NouveauClientForm() {
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
      const res = await fetch("/api/clients", {
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
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        + Nouveau client
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <input name="nom" placeholder="Nom" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <select name="type" defaultValue="PARTICULIER" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="PARTICULIER">Particulier</option>
        <option value="ENTREPRISE">Entreprise</option>
        <option value="INSTITUTION">Institution</option>
        <option value="ONG">ONG</option>
      </select>
      <input name="telephone" placeholder="Téléphone" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input
        name="ville"
        placeholder="Ville"
        defaultValue="Port-au-Prince"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "…" : "Créer"}
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
