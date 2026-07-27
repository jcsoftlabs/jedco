"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function DemandeRow({
  demande,
  libellesService,
  surligner = false,
}: {
  /** code → libellé, issu de la table de référence TypeService. */
  libellesService: Record<string, string>;
  /** Vrai quand cette ligne est visée par ?highlight=<id> (venu de la cloche
      de notifications) — la ligne se scrolle en vue et se met en évidence
      un instant, pour que l'admin retrouve immédiatement la demande cliquée. */
  surligner?: boolean;
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
  const [erreur, setErreur] = useState<string | null>(null);
  const [enEvidence, setEnEvidence] = useState(surligner);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!surligner) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setEnEvidence(false), 3000);
    return () => clearTimeout(t);
  }, [surligner]);

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

  async function creerDevis() {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/demandes-devis/${demande.id}/convertir-client`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      const libelle = libellesService[data.data.service] ?? data.data.service;
      router.push(`/admin/devis?clientId=${data.data.clientId}&description=${encodeURIComponent(libelle)}&ouvrir=1`);
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div
      ref={ref}
      className={`rounded-lg border bg-white p-4 transition-shadow ${
        demande.traite ? "border-slate-200 opacity-60" : "border-jedco/30"
      } ${enEvidence ? "ring-2 ring-jedco ring-offset-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-jedco-dark">{demande.nom}</p>
          <p className="text-xs text-slate-500">{new Date(demande.createdAt).toLocaleString("fr-FR", { hour12: true })}</p>
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
          {libellesService[demande.service] ?? demande.service} — {demande.ville}
        </p>
        {demande.message && <p className="italic text-slate-500">&quot;{demande.message}&quot;</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={envoi}
          onClick={creerDevis}
          className="text-xs rounded bg-jedco px-3 py-1.5 font-semibold text-white hover:bg-jedco-light transition disabled:opacity-50"
        >
          Créer un devis
        </button>
        <button
          disabled={envoi}
          onClick={basculerTraite}
          className="text-xs rounded border border-slate-300 px-2 py-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          {demande.traite ? "Marquer non traitée" : "Marquer traitée"}
        </button>
      </div>
      {erreur && <p className="mt-2 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
