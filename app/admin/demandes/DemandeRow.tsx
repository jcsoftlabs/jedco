"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemandeRow({
  demande,
}: {
  demande: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    service: string;
    ville: string;
    message: string | null;
    traite: boolean;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function basculerTraite() {
    setEnvoi(true);
    try {
      await fetch(`/api/demandes-devis/${demande.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traite: !demande.traite }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className={`rounded-lg border bg-white p-4 ${demande.traite ? "border-slate-200 opacity-60" : "border-jedco/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-jedco-dark">{demande.nom}</p>
          <p className="text-xs text-slate-500">{new Date(demande.createdAt).toLocaleString("fr-FR")}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            demande.traite ? "bg-slate-200 text-slate-500" : "bg-amber-100 text-amber-700"
          }`}
        >
          {demande.traite ? "TRAITÉE" : "NON TRAITÉE"}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>
          <a href={`tel:${demande.telephone}`} className="text-jedco hover:underline">
            {demande.telephone}
          </a>
          {demande.email && <span> — {demande.email}</span>}
        </p>
        <p>
          {demande.service} — {demande.ville}
        </p>
        {demande.message && <p className="italic text-slate-500">&quot;{demande.message}&quot;</p>}
      </div>

      <button
        disabled={envoi}
        onClick={basculerTraite}
        className="mt-3 text-xs rounded border border-slate-300 px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        {demande.traite ? "Marquer non traitée" : "Marquer traitée"}
      </button>
    </div>
  );
}
