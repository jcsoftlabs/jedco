import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerFactures, totauxFactures } from "@/lib/services/factures";
import { statutFactureSchema } from "@/lib/schemas/factures";
import { listerClientsPourSelection } from "@/lib/services/clients";
import { listerCatalogue } from "@/lib/services/catalogue";
import { formatHTG } from "@/lib/money";
import { prisma } from "@/lib/db";
import Link from "next/link";
import NouvelleFactureForm from "./NouvelleFactureForm";
import FacturesTable from "./FacturesTable";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    toiletteMobileId?: string;
    page?: string;
    q?: string;
    statut?: string;
    dateDebut?: string;
    dateFin?: string;
  }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const {
    clientId,
    toiletteMobileId,
    page: pageParam,
    q,
    statut,
    dateDebut: dateDebutParam,
    dateFin: dateFinParam,
  } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const statutValide = statutFactureSchema.safeParse(statut).data;
  // new Date("2026-13-40") produit un objet Invalid Date plutôt que de lever
  // — on vérifie explicitement avant de l'envoyer au filtre Prisma, sinon une
  // date saisie à la main dans l'URL casserait silencieusement le filtrage.
  const dateDebut =
    dateDebutParam && !Number.isNaN(new Date(dateDebutParam).getTime()) ? new Date(dateDebutParam) : undefined;
  const dateFin =
    dateFinParam && !Number.isNaN(new Date(dateFinParam).getTime()) ? new Date(dateFinParam) : undefined;

  const [{ data: factures, meta }, clients, stats, catalogue, toiletteFiltree] = await Promise.all([
    listerFactures({
      page,
      limit: TAILLE_PAGE_DEFAUT,
      search: q,
      statut: statutValide,
      dateDebut,
      dateFin,
      toiletteMobileId,
    }),
    listerClientsPourSelection(),
    totauxFactures(),
    listerCatalogue({ actif: true }),
    toiletteMobileId
      ? prisma.toiletteMobile.findUnique({ where: { id: toiletteMobileId }, select: { code: true } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-jedco-dark">Facturation</h2>

      {toiletteMobileId && (
        <div className="flex items-center justify-between rounded-lg border border-jedco/30 bg-jedco/5 px-4 py-2.5 text-sm">
          <span className="text-jedco-dark">
            Filtré sur les factures de la toilette mobile{" "}
            <strong>{toiletteFiltree?.code ?? toiletteMobileId}</strong>
          </span>
          <Link href="/admin/factures" className="text-xs font-medium text-jedco hover:underline">
            Retirer le filtre
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total facturé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco-dark">{formatHTG(stats.totalFactureHTG)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total encaissé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">{formatHTG(stats.totalPayeHTG)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Impayé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-red-600">{formatHTG(stats.totalImpayeHTG)}</p>
        </div>
      </div>

      <NouvelleFactureForm
        clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
        clientIdParDefaut={clientId}
        catalogue={catalogue.map((a) => ({
          nom: a.nom,
          prixSuggereHTG: a.prixSuggereHTG?.toString() ?? null,
        }))}
      />

      <FacturesTable
        factures={factures.map((f) => ({
          id: f.id,
          reference: f.reference,
          statut: f.statut,
          montantHTG: f.montantHTG.toString(),
          taxeHTG: f.taxeHTG.toString(),
          totalHTG: f.totalHTG.toString(),
          dateEcheance: f.dateEcheance.toISOString(),
          client: { nom: f.client.nom, email: f.client.email },
          paiements: f.paiements.map((p) => ({ montantHTG: p.montantHTG.toString() })),
          lignes: f.lignes.map((l) => ({
            description: l.description,
            service: l.service,
            quantite: l.quantite,
            prixUnitaireHTG: l.prixUnitaireHTG.toString(),
          })),
        }))}
        catalogue={catalogue.map((a) => ({
          nom: a.nom,
          prixSuggereHTG: a.prixSuggereHTG?.toString() ?? null,
        }))}
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Pager
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          basePath="/admin/factures"
          searchParams={{ clientId, toiletteMobileId, q, statut, dateDebut: dateDebutParam, dateFin: dateFinParam }}
        />
      </div>
    </div>
  );
}
