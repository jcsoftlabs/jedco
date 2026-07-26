"use client";

import Link from "next/link";
import TableauFiltrable from "../TableauFiltrable";
import { LIBELLE_TYPE, LIBELLE_STATUT, COULEUR_STATUT } from "./libelles";

type Vehicule = {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type: string;
  statut: string;
  kilometrage: number;
  prochainEntretien: string | null;
  nbInterventions: number;
};

export default function VehiculesTable({ vehicules }: { vehicules: Vehicule[] }) {
  const maintenant = Date.now();

  return (
    <TableauFiltrable
      lignes={vehicules}
      placeholder="Rechercher un véhicule (immatriculation, marque, modèle…)"
      texteDe={(v) => [v.immatriculation, v.marque, v.modele, LIBELLE_TYPE[v.type], LIBELLE_STATUT[v.statut]]}
      valeurFiltreDe={(v) => v.statut}
      filtres={{
        label: "Statut",
        options: Object.entries(LIBELLE_STATUT).map(([valeur, label]) => ({ valeur, label })),
      }}
    >
      {(lignes) => (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 px-4 font-medium">Immatriculation</th>
                <th className="px-4 font-medium">Véhicule</th>
                <th className="px-4 font-medium">Type</th>
                <th className="px-4 font-medium">Kilométrage</th>
                <th className="px-4 font-medium">Prochain entretien</th>
                <th className="px-4 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((v) => {
                const echeance = v.prochainEntretien ? new Date(v.prochainEntretien) : null;
                const enRetard = echeance !== null && echeance.getTime() < maintenant;
                return (
                  <tr key={v.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <Link
                        href={`/admin/vehicules/${v.id}`}
                        className="font-mono text-xs font-medium text-jedco hover:underline"
                      >
                        {v.immatriculation}
                      </Link>
                    </td>
                    <td className="px-4 text-slate-600">
                      {v.marque} {v.modele}
                    </td>
                    <td className="px-4 text-slate-600">{LIBELLE_TYPE[v.type] ?? v.type}</td>
                    <td className="px-4 tabular-nums text-slate-600">
                      {new Intl.NumberFormat("fr-FR").format(v.kilometrage)} km
                    </td>
                    <td className={`px-4 ${enRetard ? "font-medium text-red-600" : "text-slate-600"}`}>
                      {echeance ? echeance.toLocaleDateString("fr-FR") : "—"}
                      {enRetard && " (en retard)"}
                    </td>
                    <td className="px-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT[v.statut] ?? ""}`}
                      >
                        {LIBELLE_STATUT[v.statut] ?? v.statut}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-400">
                    {vehicules.length === 0
                      ? "Aucun véhicule dans la flotte."
                      : "Aucun véhicule ne correspond à cette recherche."}
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
