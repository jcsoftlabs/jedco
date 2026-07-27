import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listerInterventions, compterInterventionsNonFacturees } from "@/lib/services/interventions";
import { statutInterventionSchema, canalDemandeSchema } from "@/lib/schemas/interventions";
import { listerClientsPourSelection } from "@/lib/services/clients";
import { listerTechniciens } from "@/lib/services/techniciens";
import { listerTypesService } from "@/lib/services/types-reference";
import { prisma } from "@/lib/db";
import NouvelleInterventionForm from "./NouvelleInterventionForm";
import InterventionsTable from "./InterventionsTable";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function InterventionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    statut?: string;
    nonFacturees?: string;
    canal?: string;
  }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  // Pas de fuite de données (scopeInterventions renvoie une liste vide pour
  // un rôle sans fiche technicien), mais un SUPPORT n'a rien à faire ici.
  if (user.role === "SUPPORT") redirect("/admin/support");

  const { page: pageParam, q, statut, nonFacturees, canal } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const statutValide = statutInterventionSchema.safeParse(statut).data;
  const canalValide = canalDemandeSchema.safeParse(canal).data;
  const nonFactureesValide = nonFacturees === "true" ? true : undefined;

  const [{ data: interventions, meta }, clients, vehicules, techniciens, typesService, nombreNonFacturees] =
    await Promise.all([
      listerInterventions(
        {
          page,
          limit: TAILLE_PAGE_DEFAUT,
          search: q,
          statut: statutValide,
          nonFacturees: nonFactureesValide,
          canal: canalValide,
        },
        user
      ),
      listerClientsPourSelection(),
      prisma.vehicule.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
      listerTechniciens(),
      listerTypesService(true),
      compterInterventionsNonFacturees(user),
    ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-jedco-dark">Interventions</h2>

      <div className="flex flex-wrap items-start gap-3">
        <NouvelleInterventionForm
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          vehicules={vehicules.map((v) => ({ id: v.id, immatriculation: v.immatriculation, marque: v.marque }))}
          techniciens={techniciens.map((t) => ({
            id: t.id,
            matricule: t.matricule,
            nom: t.user.nom,
            prenom: t.user.prenom,
            disponible: t.disponible,
          }))}
          typesService={typesService}
        />
        <Link
          href="/admin/interventions/calendrier"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Calendrier opérationnel
        </Link>
        <Link
          href="/admin/vehicules"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Gérer la flotte
        </Link>
      </div>

      {nombreNonFacturees > 0 && (
        <Link
          href="/admin/interventions?nonFacturees=true"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300"
        >
          <p className="text-sm font-semibold text-amber-800">
            {nombreNonFacturees} intervention{nombreNonFacturees > 1 ? "s" : ""} terminée
            {nombreNonFacturees > 1 ? "s" : ""} non facturée{nombreNonFacturees > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">Cliquez pour filtrer la liste ci-dessous.</p>
        </Link>
      )}

      <InterventionsTable
        interventions={interventions.map((i) => ({
          id: i.id,
          reference: i.reference,
          type: i.type,
          statut: i.statut,
          priorite: i.priorite,
          canal: i.canal,
          ville: i.ville,
          datePlanifiee: i.datePlanifiee ? i.datePlanifiee.toISOString() : null,
          client: { nom: i.client.nom },
          vehicule: i.vehicule ? { immatriculation: i.vehicule.immatriculation } : null,
        }))}
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Pager
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          basePath="/admin/interventions"
          searchParams={{ q, statut, nonFacturees, canal }}
        />
      </div>
    </div>
  );
}
