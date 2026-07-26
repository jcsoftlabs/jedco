"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function formatHTGCentimes(centimes: string | null): string {
  if (centimes === null) return "—";
  const montant = Number(centimes) / 100;
  return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montant)} HTG`;
}

export default function ArticleRow({
  article,
}: {
  article: { id: string; nom: string; type: string | null; prixSuggereHTG: string | null; actif: boolean };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function basculerActif() {
    setEnvoi(true);
    try {
      await fetch(`/api/catalogue/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !article.actif }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 px-4">{article.nom}</td>
      <td className="px-4 text-slate-500">{article.type ?? "—"}</td>
      <td className="px-4">{formatHTGCentimes(article.prixSuggereHTG)}</td>
      <td className="px-4">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            article.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {article.actif ? "ACTIF" : "INACTIF"}
        </span>
      </td>
      <td className="px-4 py-2">
        <button
          disabled={envoi}
          onClick={basculerActif}
          className="text-xs rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        >
          {article.actif ? "Désactiver" : "Réactiver"}
        </button>
      </td>
    </tr>
  );
}
