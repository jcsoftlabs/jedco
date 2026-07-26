import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerVehicules, statsFlotte } from "@/lib/services/vehicules";
import { formatHTG } from "@/lib/money";
import NouveauVehiculeForm from "./NouveauVehiculeForm";
import VehiculesTable from "./VehiculesTable";

export default async function VehiculesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const [vehicules, stats] = await Promise.all([listerVehicules(), statsFlotte()]);
  const maintenant = Date.now();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-jedco-dark">Flotte</h2>
        <NouveauVehiculeForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Véhicules</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco-dark">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Disponibles</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">{stats.disponibles}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">En maintenance</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-600">{stats.enMaintenance}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Coût entretien cumulé</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-jedco-dark">
            {formatHTG(stats.coutEntretienTotalHTG)}
          </p>
        </div>
      </div>

      {stats.entretiensDus.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            Entretien à prévoir ({stats.entretiensDus.length})
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-700">
            {stats.entretiensDus.map((v) => {
              const echeance = v.prochainEntretien!;
              const depasse = echeance.getTime() < maintenant;
              return (
                <li key={v.id}>
                  <span className="font-mono">{v.immatriculation}</span> —{" "}
                  {depasse ? "en retard depuis le" : "prévu le"}{" "}
                  {echeance.toLocaleDateString("fr-FR")}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <VehiculesTable
        vehicules={vehicules.map((v) => ({
          id: v.id,
          immatriculation: v.immatriculation,
          marque: v.marque,
          modele: v.modele,
          type: v.type,
          statut: v.statut,
          kilometrage: v.kilometrage,
          prochainEntretien: v.prochainEntretien ? v.prochainEntretien.toISOString() : null,
          nbInterventions: v._count.interventions,
        }))}
      />
    </div>
  );
}
