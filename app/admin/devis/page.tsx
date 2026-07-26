import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerDevis } from "@/lib/services/devis";
import { statutDevisSchema } from "@/lib/schemas/devis";
import { listerClients } from "@/lib/services/clients";
import { listerCatalogue } from "@/lib/services/catalogue";
import NouveauDevisForm from "./NouveauDevisForm";
import DevisTable from "./DevisTable";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    description?: string;
    ouvrir?: string;
    page?: string;
    q?: string;
    statut?: string;
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

  const { clientId, description, ouvrir, page: pageParam, q, statut } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const statutValide = statutDevisSchema.safeParse(statut).data;

  const [{ data: devis, meta }, { data: clients }, catalogue] = await Promise.all([
    listerDevis({ page, limit: TAILLE_PAGE_DEFAUT, search: q, statut: statutValide }),
    listerClients({ page: 1, limit: 200 }),
    listerCatalogue({ actif: true }),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-jedco-dark">Devis</h2>

      <NouveauDevisForm
        clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
        clientIdParDefaut={clientId}
        descriptionParDefaut={description}
        ouvrirParDefaut={ouvrir === "1"}
        catalogue={catalogue.map((a) => ({
          nom: a.nom,
          prixSuggereHTG: a.prixSuggereHTG?.toString() ?? null,
        }))}
      />

      <DevisTable
        devis={devis.map((d) => ({
          id: d.id,
          reference: d.reference,
          statut: d.statut,
          totalHTG: d.totalHTG.toString(),
          dateValidite: d.dateValidite.toISOString(),
          client: { nom: d.client.nom, email: d.client.email },
        }))}
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Pager
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          basePath="/admin/devis"
          searchParams={{ clientId, description, ouvrir, q, statut }}
        />
      </div>
    </div>
  );
}
