import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listerInterventions } from "@/lib/services/interventions";
import { listerClients } from "@/lib/services/clients";
import { listerTechniciens } from "@/lib/services/techniciens";
import { prisma } from "@/lib/db";
import NouvelleInterventionForm from "./NouvelleInterventionForm";
import InterventionsTable from "./InterventionsTable";

export default async function InterventionsPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  const [{ data: interventions }, { data: clients }, vehicules, techniciens] = await Promise.all([
    listerInterventions({ page: 1, limit: 200 }, user),
    listerClients({ page: 1, limit: 200 }),
    prisma.vehicule.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
    listerTechniciens(),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h2 className="text-2xl font-bold text-jedco-dark">Interventions</h2>

      <div className="flex flex-wrap items-start gap-3">
        <NouvelleInterventionForm
          clients={clients.map((c) => ({ id: c.id, nom: c.nom, code: c.code }))}
          vehicules={vehicules.map((v) => ({ id: v.id, immatriculation: v.immatriculation, marque: v.marque }))}
          techniciens={techniciens.map((t) => ({
            id: t.id,
            matricule: t.matricule,
            nom: t.user.nom,
            prenom: t.user.prenom,
            disponible: t.disponible,
          }))}
        />
        <Link
          href="/admin/vehicules"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Gérer la flotte
        </Link>
      </div>

      <InterventionsTable
        interventions={interventions.map((i) => ({
          id: i.id,
          reference: i.reference,
          type: i.type,
          statut: i.statut,
          priorite: i.priorite,
          ville: i.ville,
          datePlanifiee: i.datePlanifiee ? i.datePlanifiee.toISOString() : null,
          client: { nom: i.client.nom },
          vehicule: i.vehicule ? { immatriculation: i.vehicule.immatriculation } : null,
        }))}
      />
    </div>
  );
}
