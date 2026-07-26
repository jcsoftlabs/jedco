import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerDevis } from "@/lib/services/devis";
import { listerClients } from "@/lib/services/clients";
import { listerCatalogue } from "@/lib/services/catalogue";
import NouveauDevisForm from "./NouveauDevisForm";
import DevisTable from "./DevisTable";

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; description?: string; ouvrir?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { clientId, description, ouvrir } = await searchParams;

  const [{ data: devis }, { data: clients }, catalogue] = await Promise.all([
    listerDevis({ page: 1, limit: 200 }),
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
    </div>
  );
}
