"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

type Toilette = {
  id: string;
  code: string;
  statut: string;
  localisationActuelle: string | null;
  notes: string | null;
  client: { nom: string; telephone: string } | null;
  dateDebutLocation: string | null;
  dateFinLocation: string | null;
};

type ClientOption = { id: string; nom: string; code: string };

const LIBELLES_STATUT: Record<string, string> = {
  DISPONIBLE: "Disponible",
  LOUEE: "Louée",
  EN_MAINTENANCE: "En maintenance",
};

const COULEURS_STATUT: Record<string, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-700",
  LOUEE: "bg-jedco/10 text-jedco",
  EN_MAINTENANCE: "bg-amber-100 text-amber-700",
};

export default function ToilettesTable({ toilettes, clients }: { toilettes: Toilette[]; clients: ClientOption[] }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireLocation, setFormulaireLocation] = useState<string | null>(null);

  async function appeler(url: string, options: RequestInit, id: string) {
    setErreur(null);
    setEnvoi(id);
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setErreur("Connexion impossible.");
      return false;
    } finally {
      setEnvoi(null);
    }
  }

  async function demarrerLocation(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await appeler(
      `/api/toilettes/${id}/location`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: fd.get("clientId"),
          dateDebutLocation: fd.get("dateDebutLocation"),
          dateFinLocation: fd.get("dateFinLocation") || undefined,
          localisationActuelle: fd.get("localisationActuelle") || undefined,
        }),
      },
      id
    );
    if (ok) setFormulaireLocation(null);
  }

  async function terminerLocation(id: string) {
    if (!confirm("Terminer cette location ? La toilette redevient disponible.")) return;
    await appeler(`/api/toilettes/${id}/location`, { method: "DELETE" }, id);
  }

  async function basculerMaintenance(t: Toilette) {
    const nouveauStatut = t.statut === "EN_MAINTENANCE" ? "DISPONIBLE" : "EN_MAINTENANCE";
    await appeler(
      `/api/toilettes/${t.id}`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: nouveauStatut }) },
      t.id
    );
  }

  async function retirer(id: string, code: string) {
    if (!confirm(`Retirer la toilette ${code} de la flotte ?`)) return;
    await appeler(`/api/toilettes/${id}`, { method: "DELETE" }, id);
  }

  return (
    <div className="space-y-3">
      {erreur && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Localisation</th>
              <th className="px-4 py-3 font-medium">Client / période</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {toilettes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucune toilette mobile enregistrée.
                </td>
              </tr>
            )}
            {toilettes.map((t) => (
              <Fragment key={t.id}>
                <tr>
                  <td className="px-4 py-3 font-mono font-medium text-jedco-dark">{t.code}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COULEURS_STATUT[t.statut]}`}>
                      {LIBELLES_STATUT[t.statut] ?? t.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{t.localisationActuelle ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.client ? (
                      <>
                        {t.client.nom}
                        {t.dateDebutLocation && (
                          <span className="block text-xs text-slate-400">
                            depuis le {new Date(t.dateDebutLocation).toLocaleDateString("fr-FR")}
                            {t.dateFinLocation && ` jusqu'au ${new Date(t.dateFinLocation).toLocaleDateString("fr-FR")}`}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {t.statut === "DISPONIBLE" && (
                        <button
                          onClick={() => setFormulaireLocation(formulaireLocation === t.id ? null : t.id)}
                          disabled={envoi === t.id}
                          className="rounded-lg bg-jedco px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-jedco-light disabled:opacity-50"
                        >
                          Louer
                        </button>
                      )}
                      {t.statut === "LOUEE" && (
                        <button
                          onClick={() => terminerLocation(t.id)}
                          disabled={envoi === t.id}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          Terminer la location
                        </button>
                      )}
                      {t.statut !== "LOUEE" && (
                        <button
                          onClick={() => basculerMaintenance(t)}
                          disabled={envoi === t.id}
                          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {t.statut === "EN_MAINTENANCE" ? "Remettre en service" : "Maintenance"}
                        </button>
                      )}
                      {t.statut !== "LOUEE" && (
                        <button
                          onClick={() => retirer(t.id, t.code)}
                          disabled={envoi === t.id}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {formulaireLocation === t.id && (
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-4 py-4">
                      <form onSubmit={(e) => demarrerLocation(e, t.id)} className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Client</label>
                          <select
                            name="clientId"
                            required
                            defaultValue=""
                            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                          >
                            <option value="" disabled>
                              Sélectionner…
                            </option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nom} ({c.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Début</label>
                          <input
                            type="date"
                            name="dateDebutLocation"
                            required
                            defaultValue={new Date().toISOString().slice(0, 10)}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Fin <span className="font-normal text-slate-400">(optionnel)</span>
                          </label>
                          <input
                            type="date"
                            name="dateFinLocation"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Localisation <span className="font-normal text-slate-400">(optionnel)</span>
                          </label>
                          <input
                            name="localisationActuelle"
                            placeholder="Adresse de livraison"
                            defaultValue={t.localisationActuelle ?? ""}
                            className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={envoi === t.id}
                          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light disabled:opacity-60"
                        >
                          {envoi === t.id ? "Démarrage…" : "Confirmer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormulaireLocation(null)}
                          className="text-xs text-slate-500 underline"
                        >
                          Annuler
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
