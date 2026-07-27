import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { statsPresenceJour } from "@/lib/services/presence";
import SelecteurDate from "./SelecteurDate";

function dateDuJour(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PresencesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { date: dateParam } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : dateDuJour();

  const stats = await statsPresenceJour(date);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-jedco-dark">Présences</h2>
          <p className="mt-1 text-sm text-slate-500">
            Qui a pointé aujourd&apos;hui — utile pour repérer une équipe injoignable avant le départ
            des tournées.
          </p>
        </div>
        <SelecteurDate date={date} max={dateDuJour()} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Présents</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">{stats.presents}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Absents</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-600">{stats.absents}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">N&apos;ont pas pointé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600">{stats.nonPointes}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Technicien</th>
              <th className="px-4 py-3 font-medium">Matricule</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.lignes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucun technicien actif.
                </td>
              </tr>
            )}
            {stats.lignes.map((l) => (
              <tr key={l.technicienId}>
                <td className="px-4 py-3 font-medium text-jedco-dark">
                  {l.prenom} {l.nom}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.matricule}</td>
                <td className="px-4 py-3">
                  {l.presence === null ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      N&apos;a pas pointé
                    </span>
                  ) : l.presence.present ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Présent
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Absent
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{l.presence?.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
