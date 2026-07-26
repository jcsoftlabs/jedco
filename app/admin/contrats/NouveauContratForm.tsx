"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OptionType = { code: string; libelle: string };

export default function NouveauContratForm({
  clients,
  typesService,
  clientIdParDefaut,
}: {
  clients: { id: string; nom: string; code: string }[];
  typesService: OptionType[];
  clientIdParDefaut?: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(Boolean(clientIdParDefaut));
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);
    const services = fd.getAll("services");

    const body = {
      clientId: fd.get("clientId"),
      type: fd.get("type"),
      services,
      montantHTG: Number(fd.get("montantHTG")),
      dateDebut: fd.get("dateDebut"),
      dateFin: fd.get("dateFin"),
      renouvellementAuto: fd.get("renouvellementAuto") === "on",
    };

    try {
      const res = await fetch("/api/contrats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
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
        + Nouveau contrat
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <select name="clientId" required defaultValue={clientIdParDefaut ?? ""} className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="" disabled>
          Sélectionner un client
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.nom}
          </option>
        ))}
      </select>

      <select name="type" defaultValue="MENSUEL" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="MENSUEL">Mensuel</option>
        <option value="TRIMESTRIEL">Trimestriel</option>
        <option value="ANNUEL">Annuel</option>
        <option value="PONCTUEL">Ponctuel</option>
      </select>

      <fieldset className="space-y-1">
        <legend className="text-xs font-medium text-slate-500 mb-1">Services couverts</legend>
        {typesService.map((s) => (
          <label key={s.code} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="services" value={s.code} />
            {s.libelle}
          </label>
        ))}
      </fieldset>

      <input
        name="montantHTG"
        type="number"
        min="1"
        step="1"
        placeholder="Montant (HTG)"
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Date début</label>
          <input name="dateDebut" type="date" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Date fin</label>
          <input name="dateFin" type="date" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="renouvellementAuto" />
        Renouvellement automatique
      </label>

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "…" : "Créer"}
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
