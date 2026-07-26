import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerFactures, statsFactures } from "@/lib/services/factures";
import { listerClients } from "@/lib/services/clients";
import { listerCatalogue } from "@/lib/services/catalogue";
import { formatHTG } from "@/lib/money";
import NouvelleFactureForm from "./NouvelleFactureForm";
import FactureRow from "./FactureRow";

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { clientId } = await searchParams;

  const [{ data: factures }, { data: clients }, stats, catalogue] = await Promise.all([
    listerFactures({ page: 1, limit: 50 }),
    listerClients({ page: 1, limit: 200 }),
    statsFactures({}),
    listerCatalogue({ actif: true }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-6">Facturation</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total facturé</p>
            <p className="text-lg font-bold text-jedco-dark">{formatHTG(stats.totalFactureHTG)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total encaissé</p>
            <p className="text-lg font-bold text-emerald-600">{formatHTG(stats.totalPayeHTG)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Impayé</p>
            <p className="text-lg font-bold text-red-600">{formatHTG(stats.totalImpayeHTG)}</p>
          </div>
        </div>

        <NouvelleFactureForm
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          clientIdParDefaut={clientId}
          catalogue={catalogue.map((a) => ({
            nom: a.nom,
            prixSuggereHTG: a.prixSuggereHTG?.toString() ?? null,
          }))}
        />

        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Référence</th>
              <th className="px-4">Client</th>
              <th className="px-4">Total</th>
              <th className="px-4">Reste dû</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Échéance</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {factures.map((f) => (
              <FactureRow
                key={f.id}
                facture={{
                  id: f.id,
                  reference: f.reference,
                  statut: f.statut,
                  totalHTG: f.totalHTG.toString(),
                  dateEcheance: f.dateEcheance.toISOString(),
                  client: { nom: f.client.nom, email: f.client.email },
                  paiements: f.paiements.map((p) => ({ montantHTG: p.montantHTG.toString() })),
                }}
              />
            ))}
            {factures.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-4 text-center text-slate-400">
                  Aucune facture pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
