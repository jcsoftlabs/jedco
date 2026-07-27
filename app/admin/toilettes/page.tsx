import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerToilettes, statsToilettes } from "@/lib/services/toilettes";
import { listerClientsPourSelection } from "@/lib/services/clients";
import NouvelleToiletteForm from "./NouvelleToiletteForm";
import ToilettesTable from "./ToilettesTable";

export default async function ToilettesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const [{ data: toilettes }, stats, clients] = await Promise.all([
    listerToilettes({ page: 1, limit: 100 }),
    statsToilettes(),
    listerClientsPourSelection(),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-jedco-dark">Toilettes mobiles</h2>
        <NouvelleToiletteForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco-dark">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Disponibles</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">{stats.disponibles}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Louées</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco">{stats.louees}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">En maintenance</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600">{stats.enMaintenance}</p>
        </div>
      </div>

      <ToilettesTable
        toilettes={toilettes.map((t) => ({
          id: t.id,
          code: t.code,
          statut: t.statut,
          localisationActuelle: t.localisationActuelle,
          notes: t.notes,
          client: t.client ? { nom: t.client.nom, telephone: t.client.telephone } : null,
          dateDebutLocation: t.dateDebutLocation ? t.dateDebutLocation.toISOString() : null,
          dateFinLocation: t.dateFinLocation ? t.dateFinLocation.toISOString() : null,
        }))}
        clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
      />
    </div>
  );
}
