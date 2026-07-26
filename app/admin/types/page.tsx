import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import {
  listerTypesService,
  listerTypesVehicule,
  usagesTypeService,
  usagesTypeVehicule,
} from "@/lib/services/types-reference";
import TypesPanel from "./TypesPanel";

export default async function TypesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const [services, vehicules] = await Promise.all([listerTypesService(), listerTypesVehicule()]);

  // Le nombre d'usages est calculé côté serveur pour que l'admin voie
  // immédiatement ce qu'un type « coûte » avant de le désactiver.
  const [usagesServices, usagesVehicules] = await Promise.all([
    Promise.all(services.map(async (s) => [s.code, (await usagesTypeService(s.code)).total] as const)),
    Promise.all(vehicules.map(async (v) => [v.code, (await usagesTypeVehicule(v.code)).total] as const)),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Types</h2>
        <p className="mt-1 text-sm text-slate-500">
          Prestations et types de véhicule proposés par JEDCO. Un type désactivé disparaît des
          formulaires de saisie mais reste lisible sur l&apos;historique qui l&apos;utilise déjà.
        </p>
      </div>

      <TypesPanel
        titre="Types de prestation"
        description="Utilisés par les interventions, contrats, spécialités techniciens, lignes de facture et de devis."
        famille="services"
        types={services.map((s) => ({ ...s, usages: Object.fromEntries(usagesServices)[s.code] ?? 0 }))}
      />

      <TypesPanel
        titre="Types de véhicule"
        description="Utilisés par la flotte."
        famille="vehicules"
        types={vehicules.map((v) => ({ ...v, usages: Object.fromEntries(usagesVehicules)[v.code] ?? 0 }))}
      />
    </div>
  );
}
