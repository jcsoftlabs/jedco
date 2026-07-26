import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerFactures, statsFactures } from "@/lib/services/factures";
import { listerClients } from "@/lib/services/clients";
import { listerCatalogue } from "@/lib/services/catalogue";
import { formatHTG } from "@/lib/money";
import NouvelleFactureForm from "./NouvelleFactureForm";
import FacturesTable from "./FacturesTable";

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
    listerFactures({ page: 1, limit: 200 }),
    listerClients({ page: 1, limit: 200 }),
    statsFactures({}),
    listerCatalogue({ actif: true }),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-jedco-dark">Facturation</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total facturé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco-dark">{formatHTG(stats.totalFactureHTG)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total encaissé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">{formatHTG(stats.totalPayeHTG)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Impayé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-600">{formatHTG(stats.totalImpayeHTG)}</p>
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

      <FacturesTable
        factures={factures.map((f) => ({
          id: f.id,
          reference: f.reference,
          statut: f.statut,
          totalHTG: f.totalHTG.toString(),
          dateEcheance: f.dateEcheance.toISOString(),
          client: { nom: f.client.nom, email: f.client.email },
          paiements: f.paiements.map((p) => ({ montantHTG: p.montantHTG.toString() })),
        }))}
      />
    </div>
  );
}
