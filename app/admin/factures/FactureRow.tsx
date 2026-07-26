"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FacturePreviewModal from "./FacturePreviewModal";

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-slate-100 text-slate-700",
  PARTIELLEMENT_PAYEE: "bg-amber-100 text-amber-700",
  PAYEE: "bg-emerald-100 text-emerald-700",
  EN_RETARD: "bg-red-100 text-red-700",
  ANNULEE: "bg-slate-200 text-slate-500",
};

function formatHTGCentimes(centimes: string): string {
  const montant = Number(centimes) / 100;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montant);
}

export default function FactureRow({
  facture,
}: {
  facture: {
    id: string;
    reference: string;
    statut: string;
    totalHTG: string;
    dateEcheance: string;
    client: { nom: string };
    paiements: { montantHTG: string }[];
  };
}) {
  const router = useRouter();
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("CASH");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const totalPaye = facture.paiements.reduce((s, p) => s + Number(p.montantHTG), 0);
  const resteDuCentimes = Number(facture.totalHTG) - totalPaye;
  const soldable = facture.statut !== "PAYEE" && facture.statut !== "ANNULEE";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/paiements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factureId: facture.id,
          montantHTG: Number(montant),
          mode,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setFormulaireOuvert(false);
      setMontant("");
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
        <td className="py-2 px-4 font-mono text-xs">{facture.reference}</td>
        <td className="px-4">{facture.client.nom}</td>
        <td className="px-4">{formatHTGCentimes(facture.totalHTG)} HTG</td>
        <td className="px-4">{formatHTGCentimes(String(resteDuCentimes))} HTG</td>
        <td className="px-4">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[facture.statut]}`}>
            {facture.statut}
          </span>
        </td>
        <td className="px-4">{new Date(facture.dateEcheance).toLocaleDateString("fr-FR")}</td>
        <td className="px-4 py-2">
          <div className="flex gap-2">
            <button
              onClick={() => setApercuOuvert(true)}
              className="text-xs rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100"
            >
              Aperçu
            </button>
            {soldable && (
              <button
                onClick={() => setFormulaireOuvert((v) => !v)}
                className="text-xs rounded border border-jedco px-2 py-1 text-jedco hover:bg-jedco/5"
              >
                Paiement
              </button>
            )}
          </div>
        </td>
      </tr>
      {formulaireOuvert && (
        <tr className="border-b border-slate-100 bg-slate-50">
          <td colSpan={7} className="px-4 py-3">
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Montant (HTG)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  max={resteDuCentimes / 100}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-jedco"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-jedco"
                >
                  <option value="CASH">Cash</option>
                  <option value="VIREMENT">Virement</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={envoi}
                className="rounded-lg bg-jedco px-4 py-1.5 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
              >
                {envoi ? "Enregistrement…" : "Enregistrer"}
              </button>
              {erreur && <p className="text-sm text-red-600">{erreur}</p>}
            </form>
          </td>
        </tr>
      )}
      {apercuOuvert && (
        <FacturePreviewModal
          factureId={facture.id}
          reference={facture.reference}
          onFermer={() => setApercuOuvert(false)}
        />
      )}
    </>
  );
}
