import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerClients } from "@/lib/services/clients";
import NouveauClientForm from "./NouveauClientForm";

export default async function ClientsPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { data: clients } = await listerClients({ page: 1, limit: 50 });

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-6">Clients</h2>
        <NouveauClientForm />
        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Code</th>
              <th className="px-4">Nom</th>
              <th className="px-4">Type</th>
              <th className="px-4">Ville</th>
              <th className="px-4">Téléphone</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 px-4 font-mono text-xs">{c.code}</td>
                <td className="px-4">
                  <Link href={`/admin/clients/${c.id}`} className="text-jedco hover:underline">
                    {c.nom}
                  </Link>
                </td>
                <td className="px-4">{c.type}</td>
                <td className="px-4">{c.ville}</td>
                <td className="px-4">{c.telephone}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-slate-400">
                  Aucun client pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
