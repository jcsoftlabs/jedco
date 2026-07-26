"use client";

import RechercheServeur from "../RechercheServeur";
import DevisRow from "./DevisRow";

type Devis = {
  id: string;
  reference: string;
  statut: string;
  totalHTG: string;
  dateValidite: string;
  client: { nom: string; email: string | null };
};

export default function DevisTable({ devis }: { devis: Devis[] }) {
  return (
    <div>
      <RechercheServeur
        placeholder="Rechercher un devis (référence, client…)"
        filtre={{
          label: "Statut",
          param: "statut",
          options: [
            { valeur: "BROUILLON", label: "Brouillon" },
            { valeur: "ENVOYE", label: "Envoyé" },
            { valeur: "ACCEPTE", label: "Accepté" },
            { valeur: "REFUSE", label: "Refusé" },
            { valeur: "EXPIRE", label: "Expiré" },
            { valeur: "CONVERTI", label: "Converti" },
          ],
        }}
      />
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-3 px-4 font-medium">Référence</th>
              <th className="px-4 font-medium">Client</th>
              <th className="px-4 font-medium">Total</th>
              <th className="px-4 font-medium">Statut</th>
              <th className="px-4 font-medium">Valable jusqu&apos;au</th>
              <th className="px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devis.map((d) => (
              <DevisRow key={d.id} devis={d} />
            ))}
            {devis.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-slate-400">
                  Aucun devis ne correspond à cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
