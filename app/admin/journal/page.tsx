import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerJournalAudit } from "@/lib/audit";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";
import RechercheServeur from "../RechercheServeur";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { data: entrees, meta } = await listerJournalAudit({ page, limit: TAILLE_PAGE_DEFAUT, q });

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Journal d&apos;audit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chaque connexion, création, modification et suppression significative laisse une trace ici
          — utile pour retracer qui a fait quoi, notamment sur la facturation et les comptes.
        </p>
      </div>

      <RechercheServeur placeholder="Rechercher une action, un compte, une entité…" />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Auteur</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entrees.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Aucune entrée{q ? " pour cette recherche" : ""}.
                </td>
              </tr>
            )}
            {entrees.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                  {e.createdAt.toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {e.user ? (
                    <>
                      {e.user.prenom} {e.user.nom}
                      <span className="ml-1.5 text-xs text-slate-400">({e.user.role})</span>
                    </>
                  ) : (
                    <span className="text-slate-400">Système</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-jedco-dark">{e.action}</td>
                <td className="px-4 py-3 text-slate-500">
                  {e.entityType ? (
                    <>
                      <span className="font-medium text-slate-600">{e.entityType}</span>
                      {e.entityId && <span className="ml-1.5 font-mono text-xs">{e.entityId}</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={meta.page} limit={meta.limit} total={meta.total} basePath="/admin/journal" searchParams={{ q }} />
      </div>
    </div>
  );
}
