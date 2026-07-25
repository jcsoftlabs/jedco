import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerContrats } from "@/lib/services/contrats";
import { listerClients } from "@/lib/services/clients";
import { formatHTG } from "@/lib/money";
import NouveauContratForm from "./NouveauContratForm";

export default async function ContratsPage({
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

  const [{ data: contrats }, { data: clients }] = await Promise.all([
    listerContrats({ page: 1, limit: 50 }),
    listerClients({ page: 1, limit: 200 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-6">Contrats</h2>
        <NouveauContratForm
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          clientIdParDefaut={clientId}
        />
        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Référence</th>
              <th className="px-4">Client</th>
              <th className="px-4">Type</th>
              <th className="px-4">Montant</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Échéance</th>
            </tr>
          </thead>
          <tbody>
            {contrats.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 px-4 font-mono text-xs">{c.reference}</td>
                <td className="px-4">
                  <Link href={`/admin/clients/${c.clientId}`} className="text-jedco hover:underline">
                    {c.client.nom}
                  </Link>
                </td>
                <td className="px-4">{c.type}</td>
                <td className="px-4">{formatHTG(c.montantHTG)}</td>
                <td className="px-4">{c.statut}</td>
                <td className="px-4">{c.dateFin.toLocaleDateString("fr-FR")}</td>
              </tr>
            ))}
            {contrats.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-center text-slate-400">
                  Aucun contrat pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
