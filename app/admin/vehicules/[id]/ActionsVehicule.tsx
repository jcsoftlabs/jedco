"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUTS = [
  { valeur: "DISPONIBLE", label: "Disponible" },
  { valeur: "EN_SERVICE", label: "En service" },
  { valeur: "EN_MAINTENANCE", label: "En maintenance" },
  { valeur: "HORS_SERVICE", label: "Hors service" },
];

export default function ActionsVehicule({
  vehicule,
  estAdmin,
}: {
  vehicule: { id: string; statut: string; nbInterventionsActives: number };
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function changerStatut(statut: string) {
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/vehicules/${vehicule.id}`, {
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

  async function retirer() {
    if (!confirm("Retirer ce véhicule de la flotte ? Son historique est conservé.")) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/vehicules/${vehicule.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      router.push("/admin/vehicules");
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Statut du véhicule</h3>
      <div className="flex flex-wrap gap-2">
        {STATUTS.map((s) => (
          <button
            key={s.valeur}
            disabled={envoi || s.valeur === vehicule.statut}
            onClick={() => changerStatut(s.valeur)}
            className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-60 ${
              s.valeur === vehicule.statut
                ? "border-jedco bg-jedco/10 font-medium text-jedco"
                : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {vehicule.nbInterventionsActives > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Ce véhicule est affecté à {vehicule.nbInterventionsActives} intervention(s) active(s) — il faudra
          les replanifier avant de le passer en maintenance ou hors service.
        </p>
      )}

      {erreur && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {estAdmin && (
        <button
          disabled={envoi}
          onClick={retirer}
          className="mt-4 text-xs text-red-600 hover:underline disabled:opacity-60"
        >
          Retirer de la flotte
        </button>
      )}
    </div>
  );
}
