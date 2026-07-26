"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DevisPreviewModal from "./DevisPreviewModal";
import { IconeOeil, IconeEnvoyer, IconeCheck, IconeX, IconeConvertir } from "../icons";

const COULEUR_STATUT: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  ENVOYE: "bg-amber-100 text-amber-700",
  ACCEPTE: "bg-emerald-100 text-emerald-700",
  REFUSE: "bg-red-100 text-red-700",
  EXPIRE: "bg-slate-200 text-slate-500",
  CONVERTI: "bg-jedco/10 text-jedco",
};

function formatHTGCentimes(centimes: string): string {
  const montant = Number(centimes) / 100;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montant);
}

export default function DevisRow({
  devis,
}: {
  devis: {
    id: string;
    reference: string;
    statut: string;
    totalHTG: string;
    dateValidite: string;
    client: { nom: string; email: string | null };
  };
}) {
  const router = useRouter();
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const modifiable = devis.statut !== "CONVERTI";
  const convertible = devis.statut === "ENVOYE" || devis.statut === "ACCEPTE";

  async function changerStatut(statut: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/devis/${devis.id}`, {
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

  async function convertir() {
    if (!confirm(`Convertir le devis ${devis.reference} en facture ?`)) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/devis/${devis.id}/convertir`, { method: "POST" });
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

  return (
    <>
      <tr className="border-b border-slate-100 last:border-0 align-top">
        <td className="py-2 px-4 font-mono text-xs">{devis.reference}</td>
        <td className="px-4">{devis.client.nom}</td>
        <td className="px-4">{formatHTGCentimes(devis.totalHTG)} HTG</td>
        <td className="px-4">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[devis.statut]}`}>
            {devis.statut}
          </span>
        </td>
        <td className="px-4">{new Date(devis.dateValidite).toLocaleDateString("fr-FR")}</td>
        <td className="px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setApercuOuvert(true)}
              title="Aperçu"
              aria-label="Aperçu"
              className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100"
            >
              <IconeOeil />
            </button>
            {modifiable && devis.statut === "BROUILLON" && (
              <button
                disabled={envoi}
                onClick={() => changerStatut("ENVOYE")}
                title="Marquer envoyé"
                aria-label="Marquer envoyé"
                className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                <IconeEnvoyer />
              </button>
            )}
            {modifiable && devis.statut === "ENVOYE" && (
              <>
                <button
                  disabled={envoi}
                  onClick={() => changerStatut("ACCEPTE")}
                  title="Marquer accepté"
                  aria-label="Marquer accepté"
                  className="rounded border border-emerald-300 p-1.5 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  <IconeCheck />
                </button>
                <button
                  disabled={envoi}
                  onClick={() => changerStatut("REFUSE")}
                  title="Marquer refusé"
                  aria-label="Marquer refusé"
                  className="rounded border border-red-300 p-1.5 text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  <IconeX />
                </button>
              </>
            )}
            {convertible && (
              <button
                disabled={envoi}
                onClick={convertir}
                title="Convertir en facture"
                aria-label="Convertir en facture"
                className="rounded border border-jedco p-1.5 text-jedco hover:bg-jedco/5 disabled:opacity-60"
              >
                <IconeConvertir />
              </button>
            )}
          </div>
          {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
        </td>
      </tr>
      {apercuOuvert && (
        <DevisPreviewModal
          devisId={devis.id}
          reference={devis.reference}
          clientEmail={devis.client.email}
          onFermer={() => setApercuOuvert(false)}
        />
      )}
    </>
  );
}
