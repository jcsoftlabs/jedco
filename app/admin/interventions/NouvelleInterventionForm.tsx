"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OptionType = { code: string; libelle: string };

export default function NouvelleInterventionForm({
  clients,
  vehicules,
  techniciens,
  typesService,
}: {
  clients: { id: string; nom: string; code: string }[];
  vehicules: { id: string; immatriculation: string; marque: string }[];
  typesService: OptionType[];
  techniciens: { id: string; matricule: string; nom: string; prenom: string; disponible: boolean }[];
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [technicienIds, setTechnicienIds] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function basculerTechnicien(id: string) {
    setTechnicienIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);

    const datePlanifiee = fd.get("datePlanifiee");
    const vehiculeId = fd.get("vehiculeId");

    const body = {
      clientId: fd.get("clientId"),
      type: fd.get("type"),
      adresse: fd.get("adresse"),
      ville: fd.get("ville"),
      priorite: fd.get("priorite"),
      dureeEstimeeMin: Number(fd.get("dureeEstimeeMin")),
      ...(datePlanifiee ? { datePlanifiee: new Date(String(datePlanifiee)).toISOString() } : {}),
      ...(vehiculeId ? { vehiculeId } : {}),
      technicienIds,
    };

    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        // C'est ici que le refus de double-booking (§1.3) remonte à
        // l'utilisateur : "Ce créneau est déjà occupé (véhicule ou
        // technicien indisponible)" avec un statut 409.
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      setTechnicienIds([]);
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
        + Nouvelle intervention
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <select name="clientId" required defaultValue="" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="" disabled>
          Sélectionner un client
        </option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} — {c.nom}
          </option>
        ))}
      </select>

      <select name="type" required defaultValue="" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="" disabled>
          Sélectionner un service
        </option>
        {typesService.map((t) => (
          <option key={t.code} value={t.code}>
            {t.libelle}
          </option>
        ))}
      </select>

      <input name="adresse" placeholder="Adresse" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input
        name="ville"
        placeholder="Ville"
        defaultValue="Port-au-Prince"
        required
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />

      <select name="priorite" defaultValue="NORMALE" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="NORMALE">Normale</option>
        <option value="URGENTE">Urgente</option>
      </select>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-slate-500 mb-1">Date &amp; heure planifiées</label>
          <input name="datePlanifiee" type="datetime-local" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="w-32">
          <label className="block text-xs text-slate-500 mb-1">Durée (min)</label>
          <input
            name="dureeEstimeeMin"
            type="number"
            min="15"
            step="15"
            defaultValue={60}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <select name="vehiculeId" className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
        <option value="">Aucun véhicule</option>
        {vehicules.map((v) => (
          <option key={v.id} value={v.id}>
            {v.immatriculation} — {v.marque}
          </option>
        ))}
      </select>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Techniciens assignés</label>
        <div className="flex flex-wrap gap-2">
          {techniciens.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => basculerTechnicien(t.id)}
              title={t.disponible ? undefined : "Marqué indisponible"}
              className={`text-xs rounded-full border px-2.5 py-1 ${
                technicienIds.includes(t.id)
                  ? "border-jedco bg-jedco/10 text-jedco"
                  : t.disponible
                    ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                    : "border-slate-200 text-slate-400"
              }`}
            >
              {t.matricule} — {t.prenom} {t.nom}
              {!t.disponible && " (indisponible)"}
            </button>
          ))}
          {techniciens.length === 0 && (
            <p className="text-xs text-slate-400">
              Aucun technicien enregistré — voir /admin/techniciens.
            </p>
          )}
        </div>
      </div>

      {erreur && (
        <p className="text-sm text-red-600 rounded bg-red-50 border border-red-200 px-3 py-2">{erreur}</p>
      )}

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
