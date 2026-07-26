import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import {
  listerTypesService,
  listerTypesVehicule,
  usagesTypeService,
  usagesTypeVehicule,
} from "@/lib/services/types-reference";
import { obtenirTauxUsd } from "@/lib/services/config";
import TauxChangeForm from "./TauxChangeForm";
import TypesPanel from "./TypesPanel";

export default async function ParametresPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const [services, vehicules, taux] = await Promise.all([
    listerTypesService(),
    listerTypesVehicule(),
    obtenirTauxUsd(),
  ]);

  // Le nombre d'usages est calculé côté serveur pour que l'admin voie
  // immédiatement ce qu'un type « coûte » avant de le désactiver.
  const [usagesServices, usagesVehicules] = await Promise.all([
    Promise.all(services.map(async (s) => [s.code, (await usagesTypeService(s.code)).total] as const)),
    Promise.all(vehicules.map(async (v) => [v.code, (await usagesTypeVehicule(v.code)).total] as const)),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Paramètres</h2>
        <p className="mt-1 text-sm text-slate-500">
          Valeurs métier qui pilotent les formulaires de saisie et les documents envoyés aux clients.
        </p>
      </div>

      <TauxChangeForm
        valeurActuelle={taux.valeur}
        misAJourLe={taux.misAJourLe ? taux.misAJourLe.toISOString() : null}
        estAdmin={user.role === "ADMIN"}
      />

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
