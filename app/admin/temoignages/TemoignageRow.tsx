"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TemoignageRow({
  temoignage,
}: {
  temoignage: {
    id: string;
    nom: string;
    type: string;
    note: number;
    commentaire: string;
    actif: boolean;
    ordre: number;
  };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function basculerActif() {
    setEnvoi(true);
    try {
      await fetch(`/api/temoignages/${temoignage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !temoignage.actif }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (!confirm(`Supprimer le témoignage de ${temoignage.nom} ?`)) return;
    setEnvoi(true);
    try {
      await fetch(`/api/temoignages/${temoignage.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={`rounded-lg border bg-white p-4 ${temoignage.actif ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-jedco text-sm">
            {"★".repeat(temoignage.note)}
            {"☆".repeat(5 - temoignage.note)}
          </p>
          <p className="mt-1 text-sm italic text-slate-600">&quot;{temoignage.commentaire}&quot;</p>
          <p className="mt-1 text-sm font-semibold text-jedco-dark">
            {temoignage.nom} — {temoignage.type}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            temoignage.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {temoignage.actif ? "ACTIF" : "MASQUÉ"}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          disabled={envoi}
          onClick={basculerActif}
          className="text-xs rounded border border-slate-300 px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          {temoignage.actif ? "Masquer" : "Publier"}
        </button>
        <button
          disabled={envoi}
          onClick={supprimer}
          className="text-xs rounded border border-red-300 px-2 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
