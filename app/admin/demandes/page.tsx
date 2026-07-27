import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerDemandesDevis } from "@/lib/services/demandes-devis";
import { listerRendezVous } from "@/lib/services/rendez-vous";
import { listerTypesService } from "@/lib/services/types-reference";
import DemandeRow from "./DemandeRow";
import RendezVousRow from "./RendezVousRow";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; pageRdv?: string; highlight?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { page: pageParam, pageRdv: pageRdvParam, highlight } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const pageRdv = Math.max(1, Number(pageRdvParam) || 1);

  const [{ data: demandes, meta }, { meta: metaNonTraitees }, typesService, { data: rendezVous, meta: metaRdv }, { meta: metaRdvEnAttente }] =
    await Promise.all([
      listerDemandesDevis({ page, limit: TAILLE_PAGE_DEFAUT }),
      // Comptée séparément du lot affiché : sinon le nombre "non traitées"
      // change selon la page consultée au lieu de refléter le total réel.
      listerDemandesDevis({ page: 1, limit: 1, traite: false }),
      listerTypesService(),
      listerRendezVous({ page: pageRdv, limit: TAILLE_PAGE_DEFAUT }),
      listerRendezVous({ page: 1, limit: 1, statut: "EN_ATTENTE" }),
    ]);
  const libellesService = Object.fromEntries(typesService.map((t) => [t.code, t.libelle]));
  const nonTraitees = metaNonTraitees.total;
  const rdvEnAttente = metaRdvEnAttente.total;

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

        <h2 className="mt-10 text-xl font-bold text-jedco-dark mb-1">Rendez-vous</h2>
        <p className="text-sm text-slate-500 mb-6">
          Prises de rendez-vous soumises depuis le site public.{" "}
          {rdvEnAttente > 0 && <span className="font-semibold text-jedco">{rdvEnAttente} en attente</span>}
        </p>

        <div className="space-y-3">
          {rendezVous.map((r) => (
            <RendezVousRow
              key={r.id}
              libellesService={libellesService}
              rdv={{
                id: r.id,
                nom: r.nom,
                telephone: r.telephone,
                email: r.email,
                service: r.service,
                ville: r.ville,
                adresse: r.adresse,
                dateVoulue: r.dateVoulue.toISOString(),
                message: r.message,
                statut: r.statut,
                createdAt: r.createdAt.toISOString(),
              }}
            />
          ))}
          {rendezVous.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
              Aucun rendez-vous pour l&apos;instant.
            </p>
          )}
        </div>
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <Pager
            page={metaRdv.page}
            limit={metaRdv.limit}
            total={metaRdv.total}
            basePath="/admin/demandes"
            paramPage="pageRdv"
          />
        </div>
    </div>
  );
}
