"use client";

import Link from "next/link";
import TableauFiltrable from "../TableauFiltrable";

type Client = {
  id: string;
  code: string;
  nom: string;
  type: string;
  ville: string;
  telephone: string;
  email: string | null;
};

export default function ClientsTable({ clients }: { clients: Client[] }) {
  return (
    <TableauFiltrable
      lignes={clients}
      placeholder="Rechercher un client (nom, code, ville, téléphone…)"
      texteDe={(c) => [c.code, c.nom, c.ville, c.telephone, c.email, c.type]}
      valeurFiltreDe={(c) => c.type}
      filtres={{
        label: "Type",
        options: [
          { valeur: "PARTICULIER", label: "Particulier" },
          { valeur: "ENTREPRISE", label: "Entreprise" },
          { valeur: "INSTITUTION", label: "Institution" },
          { valeur: "ONG", label: "ONG" },
        ],
      }}
    >
      {(lignes) => (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 px-4 font-medium">Code</th>
                <th className="px-4 font-medium">Nom</th>
                <th className="px-4 font-medium">Type</th>
                <th className="px-4 font-medium">Ville</th>
                <th className="px-4 font-medium">Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{c.code}</td>
                  <td className="px-4">
                    <Link href={`/admin/clients/${c.id}`} className="font-medium text-jedco hover:underline">
                      {c.nom}
                    </Link>
                  </td>
                  <td className="px-4 text-slate-600">{c.type}</td>
                  <td className="px-4 text-slate-600">{c.ville}</td>
                  <td className="px-4 text-slate-600">{c.telephone}</td>
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-400">
                    {clients.length === 0
                      ? "Aucun client pour l'instant."
                      : "Aucun client ne correspond à cette recherche."}
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
