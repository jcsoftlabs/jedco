import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerDemandesDevis } from "@/lib/services/demandes-devis";
import DemandeRow from "./DemandeRow";

export default async function DemandesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { data: demandes } = await listerDemandesDevis({ page: 1, limit: 100 });
  const nonTraitees = demandes.filter((d) => !d.traite).length;

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
    </div>
  );
}
