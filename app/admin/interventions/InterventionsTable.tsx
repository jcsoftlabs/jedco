"use client";

import TableauFiltrable from "../TableauFiltrable";
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
    <TableauFiltrable
      lignes={interventions}
      placeholder="Rechercher une intervention (référence, client, ville, véhicule…)"
      texteDe={(i) => [
        i.reference,
        i.client.nom,
        i.ville,
        i.type,
        i.statut,
        i.priorite,
        i.vehicule?.immatriculation,
      ]}
      valeurFiltreDe={(i) => i.statut}
      filtres={{
        label: "Statut",
        options: [
          { valeur: "EN_ATTENTE", label: "En attente" },
          { valeur: "PLANIFIE", label: "Planifiée" },
          { valeur: "EN_COURS", label: "En cours" },
          { valeur: "COMPLETE", label: "Terminée" },
          { valeur: "ANNULE", label: "Annulée" },
        ],
      }}
    >
      {(lignes) => (
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
              {lignes.map((i) => (
                <InterventionRow key={i.id} intervention={i} />
              ))}
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                    {interventions.length === 0
                      ? "Aucune intervention pour l'instant."
                      : "Aucune intervention ne correspond à cette recherche."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </TableauFiltrable>
  );
}
