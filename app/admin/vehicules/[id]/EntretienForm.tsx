"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { valeur: "VIDANGE_MOTEUR", label: "Vidange moteur" },
  { valeur: "REVISION", label: "Révision" },
  { valeur: "REPARATION", label: "Réparation" },
  { valeur: "PNEUS", label: "Pneus" },
  { valeur: "CARROSSERIE", label: "Carrosserie" },
  { valeur: "AUTRE", label: "Autre" },
];

export default function EntretienForm({
  vehiculeId,
  kilometrageActuel,
}: {
  vehiculeId: string;
  kilometrageActuel: number;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      const res = await fetch(`/api/vehicules/${vehiculeId}/entretiens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: fd.get("type"),
          description: fd.get("description") || undefined,
          coutHTG: Number(fd.get("coutHTG") || 0),
          kilometrage: fd.get("kilometrage") ? Number(fd.get("kilometrage")) : undefined,
          dateEntretien: fd.get("dateEntretien") || undefined,
          prochainEntretien: fd.get("prochainEntretien") || undefined,
          remettreEnService: fd.get("remettreEnService") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de l'enregistrement");
        return;
      }
      form.reset();
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
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light"
      >
        + Enregistrer un entretien
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">Nouvel entretien</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
          <select
            name="type"
            defaultValue="REVISION"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          >
            {TYPES.map((t) => (
              <option key={t.valeur} value={t.valeur}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Coût (HTG)</label>
          <input
            name="coutHTG"
            type="number"
            min="0"
            step="0.01"
            defaultValue={0}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Kilométrage relevé{" "}
            <span className="font-normal text-slate-400">
              (min. {new Intl.NumberFormat("fr-FR").format(kilometrageActuel)})
            </span>
          </label>
          <input
            name="kilometrage"
            type="number"
            min={kilometrageActuel}
            placeholder={String(kilometrageActuel)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Date de l&apos;entretien</label>
          <input
            name="dateEntretien"
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Prochain entretien</label>
          <input
            name="prochainEntretien"
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>
      </div>

      <textarea
        name="description"
        rows={2}
        placeholder="Travaux effectués (optionnel)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
      />

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="remettreEnService" className="h-4 w-4 rounded border-slate-300" />
        Remettre le véhicule disponible après cet entretien
      </label>

      {erreur && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

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
          onClick={() => setOuvert(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
