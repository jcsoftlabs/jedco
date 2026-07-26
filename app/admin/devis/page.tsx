import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerDevis } from "@/lib/services/devis";
import { listerClients } from "@/lib/services/clients";
import NouveauDevisForm from "./NouveauDevisForm";
import DevisRow from "./DevisRow";

export default async function DevisPage({
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

  const [{ data: devis }, { data: clients }] = await Promise.all([
    listerDevis({ page: 1, limit: 50 }),
    listerClients({ page: 1, limit: 200 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-6">Devis</h2>

        <NouveauDevisForm
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          clientIdParDefaut={clientId}
        />

        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Référence</th>
              <th className="px-4">Client</th>
              <th className="px-4">Total</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Valable jusqu&apos;au</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devis.map((d) => (
              <DevisRow
                key={d.id}
                devis={{
                  id: d.id,
                  reference: d.reference,
                  statut: d.statut,
                  totalHTG: d.totalHTG.toString(),
                  dateValidite: d.dateValidite.toISOString(),
                  client: { nom: d.client.nom },
                }}
              />
            ))}
            {devis.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-slate-400">
                  Aucun devis pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
