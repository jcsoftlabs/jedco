import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerClients, listerVillesClients } from "@/lib/services/clients";
import { listerTypesService } from "@/lib/services/types-reference";
import { typeClientSchema, statutPaiementClientSchema } from "@/lib/schemas/clients";
import { typeServiceSchema } from "@/lib/schemas/enums";
import NouveauClientForm from "./NouveauClientForm";
import ClientsTable from "./ClientsTable";
import Pager, { TAILLE_PAGE_DEFAUT } from "../Pager";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    type?: string;
    ville?: string;
    service?: string;
    statutPaiement?: string;
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

  const { page: pageParam, q, type, ville, service, statutPaiement } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const typeValide = typeClientSchema.safeParse(type).data;
  const serviceValide = typeServiceSchema.safeParse(service).data;
  const statutPaiementValide = statutPaiementClientSchema.safeParse(statutPaiement).data;

  const [{ data: clients, meta }, villes, typesService] = await Promise.all([
    listerClients({
      page,
      limit: TAILLE_PAGE_DEFAUT,
      search: q,
      type: typeValide,
      ville: ville || undefined,
      service: serviceValide,
      statutPaiement: statutPaiementValide,
    }),
    listerVillesClients(),
    listerTypesService(),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-jedco-dark">Clients</h2>
        <NouveauClientForm />
      </div>
      <ClientsTable
        clients={clients.map((c) => ({
          id: c.id,
          code: c.code,
          nom: c.nom,
          type: c.type,
          ville: c.ville,
          telephone: c.telephone,
          email: c.email,
        }))}
        villes={villes}
        typesService={typesService.map((t) => ({ code: t.code, libelle: t.libelle }))}
      />
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <Pager
          page={meta.page}
          limit={meta.limit}
          total={meta.total}
          basePath="/admin/clients"
          searchParams={{ q, type, ville, service, statutPaiement }}
        />
      </div>
    </div>
  );
}
