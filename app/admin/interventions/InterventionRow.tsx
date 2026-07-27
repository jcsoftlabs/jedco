"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TRANSITIONS: Record<string, string[]> = {
  EN_ATTENTE: ["PLANIFIE", "ANNULE"],
  PLANIFIE: ["EN_COURS", "ANNULE"],
  EN_COURS: ["COMPLETE", "ANNULE"],
  COMPLETE: [],
  ANNULE: [],
};

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-slate-100 text-slate-700",
  PLANIFIE: "bg-blue-100 text-blue-700",
  EN_COURS: "bg-amber-100 text-amber-700",
  COMPLETE: "bg-emerald-100 text-emerald-700",
  ANNULE: "bg-red-100 text-red-700",
};

const LIBELLE_CANAL: Record<string, string> = {
  WEB: "Web",
  TELEPHONE: "Téléphone",
  TERRAIN: "Terrain",
};

export default function InterventionRow({
  intervention,
}: {
  intervention: {
    id: string;
    reference: string;
    type: string;
    statut: string;
    priorite: string;
    canal: string;
    ville: string;
    datePlanifiee: string | null;
    client: { nom: string };
    vehicule: { immatriculation: string } | null;
  };
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(intervention.statut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function changerStatut(nouveauStatut: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/interventions/${intervention.id}/statut`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: nouveauStatut }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setStatut(nouveauStatut);
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 last:border-0 align-top">
      <td className="py-2 px-4 font-mono text-xs">{intervention.reference}</td>
      <td className="px-4">{intervention.client.nom}</td>
      <td className="px-4">{intervention.type}</td>
      <td className="px-4 text-slate-500">{LIBELLE_CANAL[intervention.canal] ?? intervention.canal}</td>
      <td className="px-4">{intervention.ville}</td>
      <td className="px-4">{intervention.vehicule?.immatriculation ?? "—"}</td>
      <td className="px-4">
        {intervention.datePlanifiee ? new Date(intervention.datePlanifiee).toLocaleString("fr-FR") : "—"}
      </td>
      <td className="px-4">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[statut]}`}>
          {statut}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {TRANSITIONS[statut]?.map((suivant) => (
            <button
              key={suivant}
              disabled={envoi}
              onClick={() => changerStatut(suivant)}
              className="text-xs rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              → {suivant}
            </button>
          ))}
        </div>
        {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
      </td>
    </tr>
  );
}
