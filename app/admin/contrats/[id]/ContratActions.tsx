"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES_RENOUVELABLES = ["MENSUEL", "TRIMESTRIEL", "ANNUEL"];

export default function ContratActions({
  contratId,
  statut,
  type,
}: {
  contratId: string;
  statut: string;
  type: string;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function renouveler() {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/contrats/${contratId}/renouveler`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors du renouvellement");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function resilier() {
    if (!confirm("Résilier ce contrat ?")) return;
    setErreur(null);
    setEnvoi(true);
    try {
      // PUT + statut: "RESILIE", pas DELETE — DELETE (supprimerContrat) fait
      // un soft delete complet (deletedAt), qui rend le contrat invisible
      // partout, y compris sur cette page (obtenirContrat filtre deletedAt).
      // Un contrat résilié doit rester consultable comme historique, au même
      // titre qu'un contrat EXPIRE ou SUSPENDU — seul le statut change.
      const res = await fetch(`/api/contrats/${contratId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "RESILIE" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la résiliation");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  const resilie = statut === "RESILIE";
  const renouvelable = TYPES_RENOUVELABLES.includes(type) && !resilie;

  if (resilie) {
    return <p className="text-sm text-slate-400">Contrat résilié — aucune action possible.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {renouvelable && (
        <button
          onClick={renouveler}
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-50"
        >
          {envoi ? "…" : "Renouveler"}
        </button>
      )}
      <button
        onClick={resilier}
        disabled={envoi}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        Résilier
      </button>
      {erreur && <p className="w-full text-sm text-red-600">{erreur}</p>}
    </div>
  );
}
