import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../../AdminHeader";
import { obtenirClient, statsClient } from "@/lib/services/clients";
import { prisma } from "@/lib/db";
import { formatHTG } from "@/lib/money";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { id } = await params;
  const client = await obtenirClient(id);
  if (!client) notFound();

  const [stats, contrats, interventions] = await Promise.all([
    statsClient(id),
    prisma.contrat.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.intervention.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <Link href="/admin/clients" className="text-sm text-jedco hover:underline">
          ← Clients
        </Link>
        <h2 className="mt-2 text-xl font-bold text-jedco-dark">{client.nom}</h2>
        <p className="text-sm text-slate-500">
          {client.code} — {client.type} — {client.ville} — {client.telephone}
        </p>

        {stats && (
          <div className="mt-4 flex gap-6 text-sm">
            <span>
              <span className="font-semibold">{stats.totalInterventions}</span> interventions
            </span>
            <span>
              <span className="font-semibold">{stats.totalFactures}</span> factures
            </span>
            <span>
              Montant dû : <span className="font-semibold">{formatHTG(stats.montantDuHTG)}</span>
            </span>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">Contrats</h3>
          <Link
            href={`/admin/contrats?clientId=${client.id}`}
            className="text-sm rounded-lg bg-jedco px-3 py-1.5 text-white hover:bg-jedco-light transition"
          >
            + Nouveau contrat
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {contrats.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              {c.reference} — {c.type} — {formatHTG(c.montantHTG)} — {c.statut}
            </li>
          ))}
          {contrats.length === 0 && <li className="text-sm text-slate-400">Aucun contrat.</li>}
        </ul>

        <div className="mt-8">
          <h3 className="font-semibold text-jedco-dark">Interventions récentes</h3>
          <ul className="mt-3 space-y-2">
            {interventions.map((i) => (
              <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                {i.reference} — {i.type} — {i.statut}
              </li>
            ))}
            {interventions.length === 0 && <li className="text-sm text-slate-400">Aucune intervention.</li>}
          </ul>
        </div>
      </main>
    </div>
  );
}
