"use client";

import RechercheServeur from "../RechercheServeur";
import FactureRow from "./FactureRow";

type Facture = {
  id: string;
  reference: string;
  statut: string;
  montantHTG: string;
  taxeHTG: string;
  totalHTG: string;
  dateEcheance: string;
  client: { nom: string; email: string | null };
  paiements: { montantHTG: string }[];
  lignes: { description: string; service: string | null; quantite: number; prixUnitaireHTG: string }[];
};

type ArticleCatalogue = { nom: string; prixSuggereHTG: string | null };

export default function FacturesTable({
  factures,
  catalogue = [],
}: {
  factures: Facture[];
  catalogue?: ArticleCatalogue[];
}) {
  return (
    <div>
      <RechercheServeur
        placeholder="Rechercher une facture (référence, client…)"
        filtre={{
          label: "Statut",
          param: "statut",
          options: [
            { valeur: "EN_ATTENTE", label: "En attente" },
            { valeur: "PARTIELLEMENT_PAYEE", label: "Partiellement payée" },
            { valeur: "PAYEE", label: "Payée" },
            { valeur: "EN_RETARD", label: "En retard" },
            { valeur: "ANNULEE", label: "Annulée" },
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
              <th className="px-4 font-medium">Reste dû</th>
              <th className="px-4 font-medium">Statut</th>
              <th className="px-4 font-medium">Échéance</th>
              <th className="px-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <FactureRow key={f.id} facture={f} catalogue={catalogue} />
            ))}
            {factures.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 px-4 text-center text-slate-400">
                  Aucune facture ne correspond à cette recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
