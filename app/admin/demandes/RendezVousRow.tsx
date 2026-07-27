"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRME: "Confirmé",
  ANNULE: "Annulé",
  TERMINE: "Terminé",
};

const COULEURS_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-700",
  CONFIRME: "bg-emerald-100 text-emerald-700",
  ANNULE: "bg-slate-200 text-slate-500",
  TERMINE: "bg-slate-200 text-slate-600",
};

export default function RendezVousRow({
  rdv,
  libellesService,
}: {
  libellesService: Record<string, string>;
  rdv: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    service: string;
    ville: string;
    adresse: string | null;
    dateVoulue: string;
    message: string | null;
    statut: string;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function changerStatut(statut: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/rendez-vous/${rdv.id}/statut`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  const traite = rdv.statut === "ANNULE" || rdv.statut === "TERMINE";

  return (
    <div className={`rounded-lg border bg-white p-4 ${traite ? "border-slate-200 opacity-60" : "border-jedco/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-jedco-dark">{rdv.nom}</p>
          <p className="text-xs text-slate-500">
            Rendez-vous souhaité le{" "}
            <strong>
              {new Date(rdv.dateVoulue).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
                hour12: true,
              })}
            </strong>
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${COULEURS_STATUT[rdv.statut]}`}>
          {LIBELLES_STATUT[rdv.statut] ?? rdv.statut}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>
          <a href={`tel:${rdv.telephone}`} className="text-jedco hover:underline">
            {rdv.telephone}
          </a>
          {rdv.email && <span> — {rdv.email}</span>}
        </p>
        <p>
          {libellesService[rdv.service] ?? rdv.service} — {rdv.ville}
          {rdv.adresse && <span>, {rdv.adresse}</span>}
        </p>
        {rdv.message && <p className="italic text-slate-500">&quot;{rdv.message}&quot;</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {rdv.statut === "EN_ATTENTE" && (
          <button
            disabled={envoi}
            onClick={() => changerStatut("CONFIRME")}
            className="text-xs rounded bg-jedco px-3 py-1.5 font-semibold text-white hover:bg-jedco-light transition disabled:opacity-50"
          >
            Confirmer
          </button>
        )}
        {rdv.statut === "CONFIRME" && (
          <button
            disabled={envoi}
            onClick={() => changerStatut("TERMINE")}
            className="text-xs rounded bg-jedco px-3 py-1.5 font-semibold text-white hover:bg-jedco-light transition disabled:opacity-50"
          >
            Marquer terminé
          </button>
        )}
        {(rdv.statut === "EN_ATTENTE" || rdv.statut === "CONFIRME") && (
          <button
            disabled={envoi}
            onClick={() => changerStatut("ANNULE")}
            className="text-xs rounded border border-slate-300 px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Annuler
          </button>
        )}
      </div>
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
