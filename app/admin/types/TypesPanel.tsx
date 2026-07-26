"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TypeRef = { code: string; libelle: string; actif: boolean; ordre: number; usages: number };

export default function TypesPanel({
  titre,
  description,
  famille,
  types,
}: {
  titre: string;
  description: string;
  famille: "services" | "vehicules";
  types: TypeRef[];
}) {
  const router = useRouter();
  const [libelle, setLibelle] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/types-reference/${famille}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle, ordre: types.length + 1 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setLibelle("");
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerActif(t: TypeRef) {
    setErreur(null);
    setEnvoi(true);
    try {
      await fetch(`/api/types-reference/${famille}/${t.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !t.actif }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">{titre}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>

      <form onSubmit={ajouter} className="mt-4 flex flex-wrap gap-2">
        <input
          required
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          placeholder="Nouveau type (ex : Curage de canalisation)"
          className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
        />
        <button
          type="submit"
          disabled={envoi || !libelle.trim()}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>

      {erreur && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {types.map((t) => (
          <li key={t.code} className={`flex flex-wrap items-center gap-3 py-2.5 ${t.actif ? "" : "opacity-60"}`}>
            <span className="flex-1 text-sm text-slate-700">{t.libelle}</span>
            <span className="font-mono text-xs text-slate-400">{t.code}</span>
            <span className="text-xs text-slate-400">
              {t.usages > 0 ? `${t.usages} utilisation(s)` : "non utilisé"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                t.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {t.actif ? "Actif" : "Masqué"}
            </span>
            <button
              disabled={envoi}
              onClick={() => basculerActif(t)}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {t.actif ? "Masquer" : "Réactiver"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
