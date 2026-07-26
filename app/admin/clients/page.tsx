import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerClients } from "@/lib/services/clients";
import NouveauClientForm from "./NouveauClientForm";
import ClientsTable from "./ClientsTable";

export default async function ClientsPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { data: clients } = await listerClients({ page: 1, limit: 200 });

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
      />
    </div>
  );
}
