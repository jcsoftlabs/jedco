import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import AdminHeader from "../AdminHeader";
import { listerInterventions } from "@/lib/services/interventions";
import { STATUTS_ACTIFS } from "@/lib/interventions/statut";
import InterventionTerrainCard from "./InterventionTerrainCard";

export default async function TerrainPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  // scopeInterventions (lib/auth/rbac.ts) réduit automatiquement cette liste
  // aux interventions assignées à l'utilisateur s'il est TECHNICIEN — ADMIN
  // et SUPERVISEUR voient tout, ce qui permet aussi de s'en servir comme
  // tableau de suivi terrain pour un superviseur.
  const { data: toutes } = await listerInterventions({ page: 1, limit: 100 }, user);

  const actives = toutes
    .filter((i) => STATUTS_ACTIFS.includes(i.statut))
    .sort((a, b) => {
      const ordre = { EN_COURS: 0, PLANIFIE: 1, EN_ATTENTE: 2 };
      return (ordre[a.statut as keyof typeof ordre] ?? 3) - (ordre[b.statut as keyof typeof ordre] ?? 3);
    });
  const terminees = toutes.filter((i) => i.statut === "COMPLETE").slice(0, 10);

  function versProps(i: (typeof toutes)[number]) {
    return {
      id: i.id,
      reference: i.reference,
      type: i.type,
      statut: i.statut,
      priorite: i.priorite,
      adresse: i.adresse,
      ville: i.ville,
      description: i.description,
      datePlanifiee: i.datePlanifiee ? i.datePlanifiee.toISOString() : null,
      client: { nom: i.client.nom, telephone: i.client.telephone },
      vehicule: i.vehicule ? { immatriculation: i.vehicule.immatriculation } : null,
      aDejaUnRapport: i.rapportExecution !== null,
    };
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-4 py-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-1">Terrain</h2>
        <p className="text-sm text-slate-500 mb-6">Mes interventions en cours et à venir.</p>

        <div className="space-y-3">
          {actives.map((i) => (
            <InterventionTerrainCard key={i.id} intervention={versProps(i)} />
          ))}
          {actives.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
              Aucune intervention active pour l&apos;instant.
            </p>
          )}
        </div>

        {terminees.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-slate-500">Terminées récemment</h3>
            <div className="space-y-3">
              {terminees.map((i) => (
                <InterventionTerrainCard key={i.id} intervention={versProps(i)} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
