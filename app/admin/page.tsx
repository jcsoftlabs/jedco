import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { statsPilotage } from "@/lib/services/pilotage";
import { formatHTG, centimesToHTG } from "@/lib/money";
import RevenusChart from "./charts/RevenusChart";
import RevenusParServiceChart from "./charts/RevenusParServiceChart";

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

function Carte({
  titre,
  valeur,
  accent,
  indice,
}: {
  titre: string;
  valeur: string;
  accent?: string;
  indice?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{titre}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent ?? "text-jedco-dark"}`}>{valeur}</p>
      {indice && <p className="mt-1 text-xs text-slate-400">{indice}</p>}
    </div>
  );
}

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
      {/* Écart de 2px entre segments : deux tranches adjacentes de teintes
          proches restent distinctes même sans contraste fort. */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {Object.entries(parStatut)
          .filter(([, n]) => n > 0)
          .map(([statut, n]) => (
            <div
              key={statut}
              className={`${couleurs[statut] ?? "bg-slate-300"} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${libelles[statut] ?? statut} : ${n}`}
            />
          ))}
      </div>
      {/* Légende toujours présente : l'identité ne repose jamais sur la seule
          couleur. */}
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
  // Un TECHNICIEN n'a accès qu'à Interventions et Terrain (voir AdminShell) —
  // ce tableau de bord, plein de chiffres réservés à ADMIN/SUPERVISEUR, ne lui
  // sert à rien. Terrain est l'écran conçu pour son usage quotidien.
  if (user.role === "TECHNICIEN") redirect("/admin/terrain");

  const stats = await statsPilotage();

  const pointsGraphe = stats.serieMensuelle.map((p) => ({
    libelle: p.libelle,
    facture: centimesToHTG(p.factureHTG),
    encaisse: centimesToHTG(p.encaisseHTG),
  }));

  const partsService = Object.entries(stats.finance.revenusParService).map(([service, montant]) => ({
    service,
    montantHTG: centimesToHTG(montant as bigint),
  }));

  const alertes = [
    stats.alertes.facturesEnRetard > 0 && {
      href: "/admin/factures",
      texte: `${stats.alertes.facturesEnRetard} facture(s) en retard`,
      classe: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
    },
    stats.alertes.demandesNonTraitees > 0 && {
      href: "/admin/demandes",
      texte: `${stats.alertes.demandesNonTraitees} demande(s) non traitée(s)`,
      classe: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
    },
    stats.alertes.vehiculesEnMaintenance > 0 && {
      href: "/admin/interventions",
      texte: `${stats.alertes.vehiculesEnMaintenance} véhicule(s) en maintenance`,
      classe: "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200",
    },
  ].filter(Boolean) as { href: string; texte: string; classe: string }[];

  const tauxEncaissement =
    stats.finance.totalFactureHTG > 0n
      ? Math.round(Number((stats.finance.totalPayeHTG * 100n) / stats.finance.totalFactureHTG))
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">
          Bonjour {user.prenom} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500">Voici l&apos;activité de JEDCO en un coup d&apos;œil.</p>
      </div>

      {alertes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {alertes.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${a.classe}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              {a.texte}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Carte titre="Total facturé" valeur={formatHTG(stats.finance.totalFactureHTG)} />
        <Carte
          titre="Total encaissé"
          valeur={formatHTG(stats.finance.totalPayeHTG)}
          accent="text-emerald-600"
          indice={tauxEncaissement !== null ? `${tauxEncaissement}% du facturé` : undefined}
        />
        <Carte titre="Impayé" valeur={formatHTG(stats.finance.totalImpayeHTG)} accent="text-red-600" />
        <Carte
          titre="Conversion devis"
          valeur={stats.commercial.tauxConversionPourcent !== null ? `${stats.commercial.tauxConversionPourcent}%` : "—"}
          indice="devis émis → facturés"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-jedco-dark">Facturé et encaissé — 12 derniers mois</h3>
        <p className="mb-4 text-xs text-slate-400">Survolez la courbe pour le détail d&apos;un mois.</p>
        <RevenusChart points={pointsGraphe} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-jedco-dark">Revenus par service</h3>
          <RevenusParServiceChart parts={partsService} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Interventions par statut</h3>
            <RepartitionBarre
              parStatut={stats.interventions.parStatut}
              libelles={LIBELLE_STATUT_INTERVENTION}
              couleurs={COULEUR_STATUT_INTERVENTION}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Carte titre="Interventions actives" valeur={String(stats.interventions.actives)} />
        <Carte
          titre="Techniciens"
          valeur={`${stats.techniciens.disponibles} / ${stats.techniciens.total}`}
          indice="disponibles"
        />
        <Carte
          titre="Véhicules"
          valeur={`${stats.vehicules.disponibles} / ${stats.vehicules.total}`}
          indice="disponibles"
        />
        <Carte titre="Demandes en attente" valeur={String(stats.commercial.demandesNonTraitees)} />
      </div>
    </div>
  );
}
