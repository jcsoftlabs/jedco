import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import AdminHeader from "../AdminHeader";
import { listerInterventions } from "@/lib/services/interventions";
import { listerClients } from "@/lib/services/clients";
import { listerTechniciens } from "@/lib/services/techniciens";
import { prisma } from "@/lib/db";
import NouvelleInterventionForm from "./NouvelleInterventionForm";
import NouveauVehiculeForm from "./NouveauVehiculeForm";
import InterventionRow from "./InterventionRow";

export default async function InterventionsPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  const [{ data: interventions }, { data: clients }, vehicules, techniciens] = await Promise.all([
    listerInterventions({ page: 1, limit: 50 }, user),
    listerClients({ page: 1, limit: 200 }),
    prisma.vehicule.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } }),
    listerTechniciens(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-2">Interventions</h2>
        <p className="text-sm text-slate-500 mb-6">
          Créez deux interventions sur le même véhicule à des horaires qui se chevauchent pour
          vérifier que le système refuse bien la seconde (§1.3 du plan).
        </p>

        <div className="flex gap-3 items-start flex-wrap">
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
          <NouveauVehiculeForm />
        </div>

        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Référence</th>
              <th className="px-4">Client</th>
              <th className="px-4">Type</th>
              <th className="px-4">Ville</th>
              <th className="px-4">Véhicule</th>
              <th className="px-4">Planifiée</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {interventions.map((i) => (
              <InterventionRow
                key={i.id}
                intervention={{
                  id: i.id,
                  reference: i.reference,
                  type: i.type,
                  statut: i.statut,
                  priorite: i.priorite,
                  ville: i.ville,
                  datePlanifiee: i.datePlanifiee ? i.datePlanifiee.toISOString() : null,
                  client: { nom: i.client.nom },
                  vehicule: i.vehicule ? { immatriculation: i.vehicule.immatriculation } : null,
                }}
              />
            ))}
            {interventions.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 px-4 text-center text-slate-400">
                  Aucune intervention pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
