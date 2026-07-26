"use client";

import RechercheServeur from "../RechercheServeur";
import InterventionRow from "./InterventionRow";

type Intervention = {
  id: string;
  reference: string;
  type: string;
  statut: string;
  priorite: string;
  ville: string;
  datePlanifiee: string | null;
  client: { nom: string };
  vehicule: { immatriculation: string } | null;
};

export default function InterventionsTable({ interventions }: { interventions: Intervention[] }) {
  return (
    <div>
      <RechercheServeur
        placeholder="Rechercher une intervention (référence, client, ville, véhicule…)"
        filtre={{
          label: "Statut",
          param: "statut",
          options: [
            { valeur: "EN_ATTENTE", label: "En attente" },
            { valeur: "PLANIFIE", label: "Planifiée" },
            { valeur: "EN_COURS", label: "En cours" },
            { valeur: "COMPLETE", label: "Terminée" },
            { valeur: "ANNULE", label: "Annulée" },
          ],
        }}
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 px-4 font-medium">Référence</th>
              <th className="px-4 font-medium">Client</th>
              <th className="px-4 font-medium">Type</th>
              <th className="px-4 font-medium">Ville</th>
              <th className="px-4 font-medium">Véhicule</th>
              <th className="px-4 font-medium">Planifiée</th>
              <th className="px-4 font-medium">Statut</th>
              <th className="px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {interventions.map((i) => (
              <InterventionRow key={i.id} intervention={i} />
            ))}
            {interventions.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                  Aucune intervention ne correspond à cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
