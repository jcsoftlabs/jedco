import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { obtenirVehicule } from "@/lib/services/vehicules";
import { formatHTG } from "@/lib/money";
import { LIBELLE_STATUT, COULEUR_STATUT, LIBELLE_ENTRETIEN } from "../libelles";
import { listerTypesVehicule } from "@/lib/services/types-reference";
import ActionsVehicule from "./ActionsVehicule";
import EntretienForm from "./EntretienForm";

export default async function VehiculeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { id } = await params;
  const vehicule = await obtenirVehicule(id);
  if (!vehicule) notFound();

  const typesVehicule = await listerTypesVehicule();
  const libelleType = typesVehicule.find((t) => t.code === vehicule.type)?.libelle ?? vehicule.type;

  const coutTotal = vehicule.entretiens.reduce((s, e) => s + e.coutHTG, 0n);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <Link href="/admin/vehicules" className="text-sm text-jedco hover:underline">
          ← Flotte
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="font-mono text-2xl font-bold text-jedco-dark">{vehicule.immatriculation}</h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${COULEUR_STATUT[vehicule.statut] ?? ""}`}
          >
            {LIBELLE_STATUT[vehicule.statut] ?? vehicule.statut}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {vehicule.marque} {vehicule.modele} — {libelleType}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Kilométrage</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-jedco-dark">
            {new Intl.NumberFormat("fr-FR").format(vehicule.kilometrage)} km
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dernier entretien</p>
          <p className="mt-2 text-xl font-bold text-jedco-dark">
            {vehicule.dernierEntretien ? vehicule.dernierEntretien.toLocaleDateString("fr-FR") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Prochain entretien</p>
          <p className="mt-2 text-xl font-bold text-jedco-dark">
            {vehicule.prochainEntretien ? vehicule.prochainEntretien.toLocaleDateString("fr-FR") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Coût entretien</p>
          <p className="mt-2 text-xl font-bold tabular-nums text-jedco-dark">{formatHTG(coutTotal)}</p>
        </div>
      </div>

      <ActionsVehicule
        vehicule={{
          id: vehicule.id,
          statut: vehicule.statut,
          nbInterventionsActives: vehicule.interventions.length,
        }}
        estAdmin={user.role === "ADMIN"}
      />

      {vehicule.interventions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-jedco-dark">
            Interventions actives ({vehicule.interventions.length})
          </h3>
          <ul className="space-y-2 text-sm">
            {vehicule.interventions.map((i) => (
              <li key={i.id} className="flex flex-wrap gap-x-3 text-slate-600">
                <span className="font-mono text-xs text-slate-400">{i.reference}</span>
                <span>{i.client.nom}</span>
                <span className="text-slate-400">
                  {i.datePlanifiee ? new Date(i.datePlanifiee).toLocaleString("fr-FR", { hour12: true }) : "non planifiée"}
                </span>
                <span className="text-slate-400">{i.statut}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <EntretienForm vehiculeId={vehicule.id} kilometrageActuel={vehicule.kilometrage} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Historique d&apos;entretien</h3>
        {vehicule.entretiens.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun entretien enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 font-medium">Date</th>
                  <th className="px-3 font-medium">Type</th>
                  <th className="px-3 font-medium">Description</th>
                  <th className="px-3 font-medium">Km</th>
                  <th className="px-3 font-medium">Coût</th>
                </tr>
              </thead>
              <tbody>
                {vehicule.entretiens.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 text-slate-600">{e.dateEntretien.toLocaleDateString("fr-FR")}</td>
                    <td className="px-3 text-slate-600">{LIBELLE_ENTRETIEN[e.type] ?? e.type}</td>
                    <td className="px-3 text-slate-500">{e.description ?? "—"}</td>
                    <td className="px-3 tabular-nums text-slate-600">
                      {e.kilometrage !== null ? new Intl.NumberFormat("fr-FR").format(e.kilometrage) : "—"}
                    </td>
                    <td className="px-3 tabular-nums text-slate-600">{formatHTG(e.coutHTG)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
