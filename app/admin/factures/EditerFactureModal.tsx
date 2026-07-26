"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconeFermer } from "../icons";
import Tooltip from "../Tooltip";

type Ligne = { description: string; quantite: string; prixUnitaireHTG: string };
type ArticleCatalogue = { nom: string; prixSuggereHTG: string | null };

const LIGNE_VIDE: Ligne = { description: "", quantite: "1", prixUnitaireHTG: "" };

export default function EditerFactureModal({
  factureId,
  reference,
  lignesInitiales,
  tauxTaxePourcentInitial,
  catalogue,
  onFermer,
}: {
  factureId: string;
  reference: string;
  lignesInitiales: Ligne[];
  tauxTaxePourcentInitial: number;
  catalogue: ArticleCatalogue[];
  onFermer: () => void;
}) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>(
    lignesInitiales.length > 0 ? lignesInitiales : [{ ...LIGNE_VIDE }]
  );
  const [tauxTaxePourcent, setTauxTaxePourcent] = useState(String(tauxTaxePourcentInitial));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  function ajouterLigne() {
    setLignes((prev) => [...prev, { ...LIGNE_VIDE }]);
  }

  function retirerLigne(index: number) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/factures/${factureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lignes: lignes.map((l) => ({
            description: l.description,
            quantite: Number(l.quantite),
            prixUnitaireHTG: Number(l.prixUnitaireHTG),
          })),
          tauxTaxePourcent: Number(tauxTaxePourcent),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      router.refresh();
      onFermer();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onFermer}>
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-jedco-dark">Modifier la facture {reference}</h3>
          <Tooltip texte="Fermer">
            <button
              onClick={onFermer}
              aria-label="Fermer"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <IconeFermer />
            </button>
          </Tooltip>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Lignes</label>
            {lignes.map((ligne, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  required
                  list="catalogue-articles-facture-edit"
                  placeholder="Description (ou choisir dans le catalogue)"
                  value={ligne.description}
                  onChange={(e) => majLigne(i, "description", e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                />
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={ligne.quantite}
                  onChange={(e) => majLigne(i, "quantite", e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                />
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Prix unit. (HTG)"
                  value={ligne.prixUnitaireHTG}
                  onChange={(e) => majLigne(i, "prixUnitaireHTG", e.target.value)}
                  className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                />
                {lignes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => retirerLigne(i)}
                    className="px-2 py-2 text-slate-400 hover:text-red-600"
                    aria-label="Retirer la ligne"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={ajouterLigne} className="text-sm text-jedco hover:underline">
              + Ajouter une ligne
            </button>
          </div>

          <datalist id="catalogue-articles-facture-edit">
            {catalogue.map((a) => (
              <option key={a.nom} value={a.nom} />
            ))}
          </datalist>

          <div className="w-40">
            <label className="mb-1 block text-sm font-medium text-slate-700">Taxe (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tauxTaxePourcent}
              onChange={(e) => setTauxTaxePourcent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={envoi}
              className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
            >
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={onFermer}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
