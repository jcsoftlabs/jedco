import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerDemandesDevis } from "@/lib/services/demandes-devis";
import { listerTypesService } from "@/lib/services/types-reference";
import DemandeRow from "./DemandeRow";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; highlight?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { page: pageParam, highlight } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ data: demandes, meta }, { meta: metaNonTraitees }, typesService] = await Promise.all([
    listerDemandesDevis({ page, limit: TAILLE_PAGE_DEFAUT }),
    // Comptée séparément du lot affiché : sinon le nombre "non traitées"
    // change selon la page consultée au lieu de refléter le total réel.
    listerDemandesDevis({ page: 1, limit: 1, traite: false }),
    listerTypesService(),
  ]);
  const libellesService = Object.fromEntries(typesService.map((t) => [t.code, t.libelle]));
  const nonTraitees = metaNonTraitees.total;

  return (
    <div className="max-w-4xl">
        <h2 className="text-xl font-bold text-jedco-dark mb-1">Demandes de devis</h2>
        <p className="text-sm text-slate-500 mb-6">
          Soumises depuis le formulaire de contact du site public.{" "}
          {nonTraitees > 0 && <span className="font-semibold text-jedco">{nonTraitees} non traitée(s)</span>}
        </p>

        <div className="space-y-3">
          {demandes.map((d) => (
            <DemandeRow
              key={d.id}
              libellesService={libellesService}
              surligner={d.id === highlight}
              demande={{
                id: d.id,
                nom: d.nom,
                telephone: d.telephone,
                email: d.email,
                service: d.service,
                ville: d.ville,
                message: d.message,
                traite: d.traite,
                createdAt: d.createdAt.toISOString(),
              }}
            />
          ))}
          {demandes.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
              Aucune demande pour l&apos;instant.
            </p>
          )}
        </div>
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <Pager page={meta.page} limit={meta.limit} total={meta.total} basePath="/admin/demandes" />
        </div>
    </div>
  );
}
