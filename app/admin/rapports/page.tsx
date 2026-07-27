import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { rapportActivite } from "@/lib/services/rapports";
import { listerTypesService } from "@/lib/services/types-reference";
import PlageDates from "../PlageDates";
import RapportExportLiens from "./RapportExportLiens";

function TableSimple({
  titre,
  colonnes,
  lignes,
}: {
  titre: string;
  colonnes: string[];
  lignes: (string | number)[][];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-jedco-dark">{titre}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {colonnes.map((c, i) => (
                <th key={c} className={`px-4 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.length === 0 && (
              <tr>
                <td colSpan={colonnes.length} className="px-4 py-8 text-center text-slate-400">
                  Aucune donnée pour l&apos;instant.
                </td>
              </tr>
            )}
            {lignes.map((ligne, i) => (
              <tr key={i}>
                {ligne.map((valeur, j) => (
                  <td key={j} className={`px-4 py-2 ${j > 0 ? "text-right tabular-nums text-slate-600" : "text-slate-700"}`}>
                    {valeur}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function RapportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateDebut?: string; dateFin?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { dateDebut: dateDebutParam, dateFin: dateFinParam } = await searchParams;
  // new Date("...") invalide produit un Invalid Date plutôt que de lever —
  // voir la même garde dans app/admin/factures/page.tsx.
  const dateDebut =
    dateDebutParam && !Number.isNaN(new Date(dateDebutParam).getTime()) ? new Date(dateDebutParam) : undefined;
  const dateFin =
    dateFinParam && !Number.isNaN(new Date(dateFinParam).getTime()) ? new Date(dateFinParam) : undefined;

  const [{ dimensions, performance, occupation }, typesService] = await Promise.all([
    rapportActivite({ dateDebut, dateFin }),
    listerTypesService(),
  ]);

  const libellesService = Object.fromEntries(typesService.map((t) => [t.code, t.libelle]));

  const lignesType = Object.entries(dimensions.parType)
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => [libellesService[code] ?? code, n] as [string, number]);
  const lignesVille = Object.entries(dimensions.parVille).sort((a, b) => b[1] - a[1]);
  const lignesPerf = performance.map((p) => [
    `${p.prenom} ${p.nom} (${p.matricule})`,
    p.interventionsAssignees,
    p.interventionsCompletees,
    p.tauxCompletionPourcent !== null ? `${p.tauxCompletionPourcent}%` : "—",
    `${p.joursPresents}/${p.joursPointes}`,
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Rapports</h2>
        <p className="mt-1 text-sm text-slate-500">
          Vue d&apos;ensemble de l&apos;activité — interventions par service et par ville, rendement des équipes
          terrain, occupation de la flotte.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PlageDates />
        <RapportExportLiens />
      </div>

      <TableSimple titre="Interventions par service" colonnes={["Service", "Nombre"]} lignes={lignesType} />
      <TableSimple titre="Interventions par ville" colonnes={["Ville", "Nombre"]} lignes={lignesVille} />
      <TableSimple
        titre="Performance des équipes terrain"
        colonnes={["Technicien", "Assignées", "Complétées", "Taux complétion", "Présences"]}
        lignes={lignesPerf}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-jedco-dark">Occupation de la flotte</h3>
        <p className="mt-1 text-xs text-slate-400">
          {dateDebut || dateFin
            ? "Sur l'intervalle sélectionné ci-dessus."
            : "Par défaut, sur les 30 derniers jours glissants (aucun intervalle sélectionné)."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Véhicules</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-jedco-dark">{occupation.nombreVehicules}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Jours de période</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-jedco-dark">{occupation.joursPeriode}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Jours-véhicule utilisés</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-jedco-dark">
              {occupation.joursUtilises} / {occupation.joursDisponibles}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Taux d&apos;occupation</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-jedco">{occupation.tauxOccupationPourcent}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
