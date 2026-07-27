"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RapportForm from "./RapportForm";

const TRANSITIONS: Record<string, string[]> = {
  EN_ATTENTE: ["PLANIFIE", "ANNULE"],
  PLANIFIE: ["EN_COURS", "ANNULE"],
  EN_COURS: ["ANNULE"],
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

const COULEUR_PRIORITE: Record<string, string> = {
  NORMALE: "text-slate-500",
  URGENTE: "text-red-600 font-semibold",
};

export default function InterventionTerrainCard({
  intervention,
}: {
  intervention: {
    id: string;
    reference: string;
    type: string;
    statut: string;
    priorite: string;
    adresse: string;
    ville: string;
    description: string | null;
    datePlanifiee: string | null;
    client: { nom: string; telephone: string };
    vehicule: { immatriculation: string } | null;
    aDejaUnRapport: boolean;
    rapportExecution: { notes: string | null; observations: string | null; signatureUrl: string | null } | null;
  };
}) {
  const router = useRouter();
  const [statut, setStatut] = useState(intervention.statut);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [rapportOuvert, setRapportOuvert] = useState(false);
  const [rapportDeplie, setRapportDeplie] = useState(false);

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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs text-slate-400">{intervention.reference}</p>
          <p className="font-semibold text-jedco-dark">{intervention.client.nom}</p>
          <p className={`text-xs ${COULEUR_PRIORITE[intervention.priorite]}`}>
            {intervention.type} — {intervention.priorite}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[statut]}`}>
          {statut}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-slate-600">
        <p>
          {intervention.adresse}, {intervention.ville}
        </p>
        {intervention.client.telephone && (
          <p>
            <a href={`tel:${intervention.client.telephone}`} className="text-jedco hover:underline">
              {intervention.client.telephone}
            </a>
          </p>
        )}
        {intervention.datePlanifiee && (
          <p>Planifiée : {new Date(intervention.datePlanifiee).toLocaleString("fr-FR", { hour12: true })}</p>
        )}
        {intervention.vehicule && <p>Véhicule : {intervention.vehicule.immatriculation}</p>}
        {intervention.description && <p className="italic text-slate-500">{intervention.description}</p>}
      </div>

      {/* Boutons ≥44px de haut et action principale pleine largeur en
          premier — un technicien utilise cet écran dehors, souvent d'une
          seule main et parfois avec des gants ; des puces text-xs de 30px
          (mesuré : la version précédente) sont trop petites pour un pouce
          et obligent une seconde main pour viser précisément. */}
      <div className="mt-4 space-y-2">
        {statut === "EN_COURS" && (
          <button
            disabled={envoi}
            onClick={() => setRapportOuvert(true)}
            className="w-full rounded-lg bg-jedco px-4 py-3 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-50"
          >
            Terminer + rapport
          </button>
        )}
        {statut !== "EN_COURS" && !intervention.aDejaUnRapport && (
          <button
            disabled={envoi}
            onClick={() => setRapportOuvert(true)}
            className="w-full rounded-lg border border-jedco px-4 py-3 text-sm font-semibold text-jedco hover:bg-jedco/5 disabled:opacity-50"
          >
            Ajouter un rapport
          </button>
        )}
        {intervention.aDejaUnRapport && (
          <button
            type="button"
            onClick={() => setRapportDeplie((v) => !v)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-100"
          >
            {rapportDeplie ? "Masquer le rapport" : "Voir le rapport"}
          </button>
        )}
        {(TRANSITIONS[statut]?.length ?? 0) > 0 && (
          <div className="flex gap-2">
            {TRANSITIONS[statut].map((suivant) => (
              <button
                key={suivant}
                disabled={envoi}
                onClick={() => changerStatut(suivant)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-3 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                → {suivant}
              </button>
            ))}
          </div>
        )}
      </div>
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}

      {rapportDeplie && intervention.rapportExecution && (
        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          {intervention.rapportExecution.notes && (
            <p>
              <span className="font-medium text-slate-700">Notes : </span>
              <span className="text-slate-600">{intervention.rapportExecution.notes}</span>
            </p>
          )}
          {intervention.rapportExecution.observations && (
            <p>
              <span className="font-medium text-slate-700">Observations : </span>
              <span className="text-slate-600">{intervention.rapportExecution.observations}</span>
            </p>
          )}
          {intervention.rapportExecution.signatureUrl ? (
            <div>
              <p className="mb-1 font-medium text-slate-700">Signature client</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- image R2 externe, pas de bénéfice à next/image ici */}
              <img
                src={intervention.rapportExecution.signatureUrl}
                alt="Signature du client"
                className="h-24 rounded border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <p className="text-xs text-slate-400">Aucune signature enregistrée.</p>
          )}
        </div>
      )}

      {rapportOuvert && (
        <RapportForm
          interventionId={intervention.id}
          marquerTermineApres={statut === "EN_COURS"}
          onFermer={() => setRapportOuvert(false)}
        />
      )}
    </div>
  );
}
