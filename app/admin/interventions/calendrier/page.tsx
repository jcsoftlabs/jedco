import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { planningDuJour } from "@/lib/services/interventions";
import { listerTechniciens } from "@/lib/services/techniciens";
import { prisma } from "@/lib/db";
import SelecteurDate from "./SelecteurDate";

type InterventionPlanning = {
  id: string;
  reference: string;
  type: string;
  statut: string;
  priorite: string;
  datePlanifiee: Date | null;
  client: { nom: string };
};

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "border-l-slate-400",
  PLANIFIE: "border-l-blue-500",
  EN_COURS: "border-l-amber-500",
  COMPLETE: "border-l-emerald-500",
  ANNULE: "border-l-red-400",
};

function CarteIntervention({ intervention }: { intervention: InterventionPlanning }) {
  return (
    <Link
      href={`/admin/interventions?q=${intervention.reference}`}
      className={`block rounded-lg border border-slate-200 border-l-4 bg-white p-2.5 text-xs shadow-sm transition hover:shadow ${COULEUR_STATUT[intervention.statut] ?? "border-l-slate-300"}`}
    >
      <p className="font-mono font-semibold text-jedco-dark">
        {intervention.datePlanifiee
          ? new Date(intervention.datePlanifiee).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "—"}
      </p>
      <p className="mt-0.5 truncate font-medium text-slate-700">{intervention.client.nom}</p>
      <p className="truncate text-slate-500">{intervention.type}</p>
      {intervention.priorite === "URGENTE" && (
        <span className="mt-1 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
          Urgente
        </span>
      )}
    </Link>
  );
}

function Colonne({
  titre,
  sousTitre,
  interventions,
}: {
  titre: string;
  sousTitre?: string;
  interventions: InterventionPlanning[];
}) {
  return (
    <div className="w-64 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-semibold text-jedco-dark">{titre}</p>
      {sousTitre && <p className="text-xs text-slate-400">{sousTitre}</p>}
      <div className="mt-2 space-y-2">
        {interventions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-2 py-3 text-center text-xs text-slate-400">
            Libre ce jour-là
          </p>
        ) : (
          interventions.map((i) => <CarteIntervention key={i.id} intervention={i} />)
        )}
      </div>
    </div>
  );
}

function dateDuJour(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; vue?: string }>;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { date: dateParam, vue: vueParam } = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateParam ?? "") ? dateParam! : dateDuJour();
  const vue = vueParam === "vehicule" ? "vehicule" : "technicien";

  const [planning, techniciens, vehicules] = await Promise.all([
    planningDuJour(new Date(`${date}T12:00:00Z`)),
    listerTechniciens(),
    prisma.vehicule.findMany({ where: { deletedAt: null }, orderBy: { immatriculation: "asc" } }),
  ]);

  // Chaque technicien/véhicule actif apparaît même sans intervention ce
  // jour-là — un dispatcher qui cherche "qui est libre ?" a autant besoin de
  // voir les colonnes vides que les colonnes chargées.
  const colonnesTechnicien = techniciens.map((t) => ({
    id: t.id,
    titre: `${t.user.prenom} ${t.user.nom}`,
    sousTitre: t.matricule,
    interventions: (planning.parTechnicien[t.id] ?? []) as InterventionPlanning[],
  }));
  const nonAssigneesTechnicien = (planning.parTechnicien.non_assigne ?? []) as InterventionPlanning[];

  const colonnesVehicule = vehicules.map((v) => ({
    id: v.id,
    titre: v.immatriculation,
    sousTitre: `${v.marque} ${v.modele}`,
    interventions: (planning.parVehicule[v.id] ?? []) as InterventionPlanning[],
  }));
  const nonAssigneesVehicule = (planning.parVehicule.non_assigne ?? []) as InterventionPlanning[];

  return (
    <div className="max-w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-jedco-dark">Calendrier opérationnel</h2>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <SelecteurDate date={date} />
      </div>

      <div className="flex gap-2 rounded-lg bg-slate-100 p-1 w-fit">
        <Link
          href={`/admin/interventions/calendrier?date=${date}&vue=technicien`}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            vue === "technicien" ? "bg-white text-jedco shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Par équipe
        </Link>
        <Link
          href={`/admin/interventions/calendrier?date=${date}&vue=vehicule`}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            vue === "vehicule" ? "bg-white text-jedco shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Par véhicule
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {vue === "technicien" ? (
          <>
            {colonnesTechnicien.map((c) => (
              <Colonne key={c.id} titre={c.titre} sousTitre={c.sousTitre} interventions={c.interventions} />
            ))}
            {colonnesTechnicien.length === 0 && (
              <p className="text-sm text-slate-400">Aucun technicien enregistré — voir Techniciens.</p>
            )}
            {nonAssigneesTechnicien.length > 0 && (
              <Colonne titre="Non assignées" interventions={nonAssigneesTechnicien} />
            )}
          </>
        ) : (
          <>
            {colonnesVehicule.map((c) => (
              <Colonne key={c.id} titre={c.titre} sousTitre={c.sousTitre} interventions={c.interventions} />
            ))}
            {colonnesVehicule.length === 0 && (
              <p className="text-sm text-slate-400">Aucun véhicule enregistré — voir Flotte.</p>
            )}
            {nonAssigneesVehicule.length > 0 && (
              <Colonne titre="Sans véhicule" interventions={nonAssigneesVehicule} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
