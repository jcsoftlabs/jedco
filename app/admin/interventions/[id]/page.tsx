import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { obtenirIntervention } from "@/lib/services/interventions";
import { listerTypesService } from "@/lib/services/types-reference";
import { formatHTG } from "@/lib/money";

const LIBELLE_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PLANIFIE: "Planifiée",
  EN_COURS: "En cours",
  COMPLETE: "Terminée",
  ANNULE: "Annulée",
};

const COULEUR_STATUT: Record<string, string> = {
  EN_ATTENTE: "bg-slate-100 text-slate-700",
  PLANIFIE: "bg-blue-100 text-blue-700",
  EN_COURS: "bg-amber-100 text-amber-700",
  COMPLETE: "bg-emerald-100 text-emerald-700",
  ANNULE: "bg-red-100 text-red-700",
};

const LIBELLE_CANAL: Record<string, string> = {
  WEB: "Web",
  TELEPHONE: "Téléphone",
  TERRAIN: "Terrain",
};

function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{valeur}</p>
    </div>
  );
}

export default async function InterventionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  if (user.role === "SUPPORT") redirect("/admin/support");

  const { id } = await params;
  // obtenirIntervention applique scopeInterventions : un TECHNICIEN qui
  // tente d'ouvrir une intervention qui n'est pas la sienne reçoit null
  // (donc 404), exactement comme si elle n'existait pas — pas de fuite
  // d'information sur son existence.
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) notFound();

  const typesService = await listerTypesService();
  const libellesService = Object.fromEntries(typesService.map((t) => [t.code, t.libelle]));

  const rapport = intervention.rapportExecution as {
    notes: string | null;
    observations: string | null;
    heureDebut: string | null;
    heureFin: string | null;
    signatureUrl: string | null;
  } | null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/interventions" className="text-sm text-jedco hover:underline">
          ← Interventions
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-jedco-dark">
            {intervention.reference}{" "}
            <span className="font-normal text-slate-400">
              — {libellesService[intervention.type] ?? intervention.type}
            </span>
          </h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${COULEUR_STATUT[intervention.statut]}`}>
            {LIBELLE_STATUT[intervention.statut] ?? intervention.statut}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-jedco-dark">Détails</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Champ
            label="Client"
            valeur={
              <Link href={`/admin/clients/${intervention.clientId}`} className="text-jedco hover:underline">
                {intervention.client.nom}
              </Link>
            }
          />
          <Champ label="Priorité" valeur={intervention.priorite} />
          <Champ label="Canal" valeur={LIBELLE_CANAL[intervention.canal] ?? intervention.canal} />
          <Champ label="Adresse" valeur={`${intervention.adresse}, ${intervention.ville}`} />
          <Champ
            label="Véhicule"
            valeur={intervention.vehicule ? intervention.vehicule.immatriculation : "—"}
          />
          <Champ
            label="Techniciens"
            valeur={
              intervention.techniciens.length > 0
                ? intervention.techniciens
                    .map((t) => `${t.technicien.user.prenom} ${t.technicien.user.nom}`)
                    .join(", ")
                : "—"
            }
          />
          <Champ
            label="Planifiée"
            valeur={
              intervention.datePlanifiee
                ? new Date(intervention.datePlanifiee).toLocaleString("fr-FR", { hour12: true })
                : "—"
            }
          />
          <Champ
            label="Exécutée"
            valeur={
              intervention.dateExecution
                ? new Date(intervention.dateExecution).toLocaleString("fr-FR", { hour12: true })
                : "—"
            }
          />
          <Champ label="Créée le" valeur={new Date(intervention.createdAt).toLocaleString("fr-FR", { hour12: true })} />
        </div>
        {intervention.description && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <Champ label="Description" valeur={intervention.description} />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-jedco-dark">Rapport d&apos;exécution</h3>
        {rapport ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {rapport.notes && <Champ label="Notes" valeur={rapport.notes} />}
              {rapport.observations && <Champ label="Observations" valeur={rapport.observations} />}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Photos</p>
              {intervention.photos.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  {intervention.photos.map((photo) => (
                    // eslint-disable-next-line @next/next/no-img-element -- photos R2 externes, pas de bénéfice à next/image ici
                    <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                      <img
                        src={photo.url}
                        alt="Photo du rapport"
                        className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-400">Aucune photo.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Signature du client</p>
              {rapport.signatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- image R2 externe, pas de bénéfice à next/image ici
                <img
                  src={rapport.signatureUrl}
                  alt="Signature du client"
                  className="mt-2 h-28 rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <p className="mt-1 text-sm text-slate-400">Aucune signature enregistrée.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aucun rapport soumis pour l&apos;instant.</p>
        )}
      </div>

      {(intervention.contrat || intervention.facture) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-jedco-dark">Liens</h3>
          <div className="space-y-2 text-sm">
            {intervention.contrat && (
              <p>
                Contrat :{" "}
                <Link href={`/admin/contrats?clientId=${intervention.clientId}`} className="text-jedco hover:underline">
                  {intervention.contrat.reference}
                </Link>
              </p>
            )}
            {intervention.facture && (
              <p>
                Facture :{" "}
                <Link href={`/admin/factures?clientId=${intervention.clientId}`} className="text-jedco hover:underline">
                  {intervention.facture.reference}
                </Link>{" "}
                — {formatHTG(intervention.facture.totalHTG)} ({intervention.facture.statut})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
