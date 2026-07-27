import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerContrats } from "@/lib/services/contrats";
import { listerClientsPourSelection } from "@/lib/services/clients";
import { formatHTG } from "@/lib/money";
import { listerTypesService } from "@/lib/services/types-reference";
import NouveauContratForm from "./NouveauContratForm";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function ContratsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; page?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { clientId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [{ data: contrats, meta }, clients, typesService, { data: expirants }] = await Promise.all([
    listerContrats({ page, limit: TAILLE_PAGE_DEFAUT }),
    listerClientsPourSelection(),
    listerTypesService(true),
    // Même seuil de 30 jours que la cloche de notifications et le premier
    // palier des alertes par e-mail nocturnes — une seule définition de
    // « bientôt » dans tout le système.
    listerContrats({ page: 1, limit: 50, expirantDansJours: 30 }),
  ]);

  return (
    <div className="max-w-4xl">
        <h2 className="text-xl font-bold text-jedco-dark mb-6">Contrats</h2>
        <NouveauContratForm
          typesService={typesService}
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          clientIdParDefaut={clientId}
        />

        {expirants.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-800">
              Contrats à renouveler bientôt ({expirants.length})
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-700">
              {expirants.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/clients/${c.clientId}`} className="hover:underline">
                    {c.reference} — {c.client.nom}
                  </Link>{" "}
                  — échéance le {c.dateFin.toLocaleDateString("fr-FR")}
                </li>
              ))}
            </ul>
          </div>
        )}
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
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <Pager
            page={meta.page}
            limit={meta.limit}
            total={meta.total}
            basePath="/admin/contrats"
            searchParams={{ clientId }}
          />
        </div>
    </div>
  );
}
