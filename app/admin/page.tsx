import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import AdminHeader from "./AdminHeader";
import { statsPilotage } from "@/lib/services/pilotage";
import { formatHTG } from "@/lib/money";

const LIBELLE_STATUT_INTERVENTION: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PLANIFIE: "Planifiée",
  EN_COURS: "En cours",
  COMPLETE: "Terminée",
  ANNULE: "Annulée",
};

const COULEUR_STATUT_INTERVENTION: Record<string, string> = {
  EN_ATTENTE: "bg-slate-400",
  PLANIFIE: "bg-blue-500",
  EN_COURS: "bg-amber-500",
  COMPLETE: "bg-emerald-500",
  ANNULE: "bg-red-400",
};

function RepartitionBarre({
  parStatut,
  libelles,
  couleurs,
}: {
  parStatut: Record<string, number>;
  libelles: Record<string, string>;
  couleurs: Record<string, string>;
}) {
  const total = Object.values(parStatut).reduce((s, n) => s + n, 0);
  if (total === 0) return <p className="text-sm text-slate-400">Aucune donnée pour l&apos;instant.</p>;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {Object.entries(parStatut)
          .filter(([, n]) => n > 0)
          .map(([statut, n]) => (
            <div
              key={statut}
              className={couleurs[statut] ?? "bg-slate-300"}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${libelles[statut] ?? statut} : ${n}`}
            />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {Object.entries(parStatut)
          .filter(([, n]) => n > 0)
          .map(([statut, n]) => (
            <span key={statut} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${couleurs[statut] ?? "bg-slate-300"}`} />
              {libelles[statut] ?? statut} ({n})
            </span>
          ))}
      </div>
    </div>
  );
}

export default async function AdminHomePage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  // Un TECHNICIEN n'a accès qu'à Interventions et Terrain (voir
  // AdminHeader.tsx) — ce tableau de bord, plein de liens et de chiffres
  // réservés à ADMIN/SUPERVISEUR, ne lui sert à rien. Terrain est l'écran
  // conçu pour son usage quotidien.
  if (user.role === "TECHNICIEN") redirect("/admin/terrain");

  const stats = await statsPilotage();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-6xl mx-auto">
        <p className="text-slate-700">
          Connecté en tant que{" "}
          <span className="font-semibold">
            {user.prenom} {user.nom}
          </span>{" "}
          ({user.role}).
        </p>

        {(stats.alertes.facturesEnRetard > 0 ||
          stats.alertes.demandesNonTraitees > 0 ||
          stats.alertes.vehiculesEnMaintenance > 0) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {stats.alertes.facturesEnRetard > 0 && (
              <Link
                href="/admin/factures"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                ⚠ {stats.alertes.facturesEnRetard} facture(s) en retard
              </Link>
            )}
            {stats.alertes.demandesNonTraitees > 0 && (
              <Link
                href="/admin/demandes"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700 hover:bg-amber-100"
              >
                ⚠ {stats.alertes.demandesNonTraitees} demande(s) non traitée(s)
              </Link>
            )}
            {stats.alertes.vehiculesEnMaintenance > 0 && (
              <Link
                href="/admin/interventions"
                className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200"
              >
                🔧 {stats.alertes.vehiculesEnMaintenance} véhicule(s) en maintenance
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total facturé</p>
            <p className="text-lg font-bold text-jedco-dark">{formatHTG(stats.finance.totalFactureHTG)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total encaissé</p>
            <p className="text-lg font-bold text-emerald-600">{formatHTG(stats.finance.totalPayeHTG)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Impayé</p>
            <p className="text-lg font-bold text-red-600">{formatHTG(stats.finance.totalImpayeHTG)}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Taux de conversion devis → facture</p>
            <p className="text-lg font-bold text-jedco-dark">
              {stats.commercial.tauxConversionPourcent !== null ? `${stats.commercial.tauxConversionPourcent}%` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Interventions actives</p>
            <p className="text-lg font-bold text-jedco-dark">{stats.interventions.actives}</p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Techniciens disponibles</p>
            <p className="text-lg font-bold text-jedco-dark">
              {stats.techniciens.disponibles} / {stats.techniciens.total}
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Véhicules disponibles</p>
            <p className="text-lg font-bold text-jedco-dark">
              {stats.vehicules.disponibles} / {stats.vehicules.total}
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Demandes non traitées</p>
            <p className="text-lg font-bold text-jedco-dark">{stats.commercial.demandesNonTraitees}</p>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Interventions par statut</h3>
            <RepartitionBarre
              parStatut={stats.interventions.parStatut}
              libelles={LIBELLE_STATUT_INTERVENTION}
              couleurs={COULEUR_STATUT_INTERVENTION}
            />
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-5">
            <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Devis par statut</h3>
            <RepartitionBarre
              parStatut={stats.commercial.devisParStatut}
              libelles={{
                BROUILLON: "Brouillon",
                ENVOYE: "Envoyé",
                ACCEPTE: "Accepté",
                REFUSE: "Refusé",
                EXPIRE: "Expiré",
                CONVERTI: "Converti",
              }}
              couleurs={{
                BROUILLON: "bg-slate-400",
                ENVOYE: "bg-amber-500",
                ACCEPTE: "bg-emerald-500",
                REFUSE: "bg-red-400",
                EXPIRE: "bg-slate-300",
                CONVERTI: "bg-jedco",
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/admin/clients" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Clients</span>
            <span className="text-sm text-slate-500">Gérer les clients</span>
          </Link>
          <Link href="/admin/contrats" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Contrats</span>
            <span className="text-sm text-slate-500">Gérer les contrats</span>
          </Link>
          <Link href="/admin/interventions" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Interventions</span>
            <span className="text-sm text-slate-500">Planifier et suivre</span>
          </Link>
          <Link href="/admin/factures" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Facturation</span>
            <span className="text-sm text-slate-500">Factures et paiements</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
