"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ligne = { description: string; quantite: string; prixUnitaireHTG: string };
type ArticleCatalogue = { nom: string; prixSuggereHTG: string | null };

const LIGNE_VIDE: Ligne = { description: "", quantite: "1", prixUnitaireHTG: "" };

export default function NouveauDevisForm({
  clients,
  clientIdParDefaut,
  catalogue = [],
  descriptionParDefaut,
  ouvrirParDefaut = false,
}: {
  clients: { id: string; nom: string; code: string }[];
  clientIdParDefaut?: string;
  catalogue?: ArticleCatalogue[];
  descriptionParDefaut?: string;
  ouvrirParDefaut?: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(ouvrirParDefaut);
  const [clientId, setClientId] = useState(clientIdParDefaut ?? "");
  const [lignes, setLignes] = useState<Ligne[]>([
    { ...LIGNE_VIDE, description: descriptionParDefaut ?? "" },
  ]);
  const [tauxTaxePourcent, setTauxTaxePourcent] = useState("0");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    setLignes((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const majee = { ...l, [champ]: valeur };
        if (champ === "description" && !l.prixUnitaireHTG) {
          const article = catalogue.find((a) => a.nom === valeur);
          if (article?.prixSuggereHTG) {
            majee.prixUnitaireHTG = String(Number(article.prixSuggereHTG) / 100);
          }
        }
        return majee;
      })
    );
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
      const res = await fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
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
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      setLignes([{ ...LIGNE_VIDE }]);
      setTauxTaxePourcent("0");
      setOuvert(false);
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        + Nouveau devis
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
        <select
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
        >
          <option value="">Sélectionner…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.nom}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Lignes</label>
        {lignes.map((ligne, i) => (
          <div key={i} className="flex gap-2 items-start">
            <input
              required
              list="catalogue-articles-devis"
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

      <datalist id="catalogue-articles-devis">
        {catalogue.map((a) => (
          <option key={a.nom} value={a.nom} />
        ))}
      </datalist>

      <div className="w-40">
        <label className="block text-sm font-medium text-slate-700 mb-1">Taxe (%)</label>
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
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "Création…" : "Créer le devis"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
