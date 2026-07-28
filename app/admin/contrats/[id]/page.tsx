import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { obtenirContrat } from "@/lib/services/contrats";
import { listerTypesService } from "@/lib/services/types-reference";
import { prisma } from "@/lib/db";
import { formatHTG } from "@/lib/money";
import ContratActions from "./ContratActions";

const LIBELLE_TYPE: Record<string, string> = {
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  ANNUEL: "Annuel",
  PONCTUEL: "Ponctuel",
};

const LIBELLE_STATUT: Record<string, string> = {
  ACTIF: "Actif",
  EXPIRE: "Expiré",
  SUSPENDU: "Suspendu",
  RESILIE: "Résilié",
};

const COULEUR_STATUT: Record<string, string> = {
  ACTIF: "bg-emerald-100 text-emerald-700",
  EXPIRE: "bg-amber-100 text-amber-700",
  SUSPENDU: "bg-slate-200 text-slate-600",
  RESILIE: "bg-red-100 text-red-700",
};

const LIBELLE_STATUT_INTERVENTION: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PLANIFIE: "Planifiée",
  EN_COURS: "En cours",
  COMPLETE: "Terminée",
  ANNULE: "Annulée",
};

const LIBELLE_STATUT_FACTURE: Record<string, string> = {
  EN_ATTENTE: "En attente",
  PARTIELLEMENT_PAYEE: "Partiellement payée",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

function Champ({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-slate-700">{valeur}</p>
    </div>
  );
}

export default async function ContratDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { id } = await params;
  const contrat = await obtenirContrat(id);
  if (!contrat) notFound();

  const [interventions, factures, typesService] = await Promise.all([
    prisma.intervention.findMany({
      where: { contratId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.facture.findMany({
      where: { contratId: id, deletedAt: null },
      orderBy: { dateEmission: "desc" },
      take: 20,
    }),
    listerTypesService(),
  ]);
  const libellesService = Object.fromEntries(typesService.map((t) => [t.code, t.libelle]));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/contrats" className="text-sm text-jedco hover:underline">
          ← Contrats
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-jedco-dark">{contrat.reference}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${COULEUR_STATUT[contrat.statut]}`}>
            {LIBELLE_STATUT[contrat.statut] ?? contrat.statut}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-jedco-dark">Détails</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Champ
            label="Client"
            valeur={
              <Link href={`/admin/clients/${contrat.clientId}`} className="text-jedco hover:underline">
                {contrat.client.nom}
              </Link>
            }
          />
          <Champ label="Type" valeur={LIBELLE_TYPE[contrat.type] ?? contrat.type} />
          <Champ label="Montant" valeur={formatHTG(contrat.montantHTG)} />
          <Champ label="Date de début" valeur={contrat.dateDebut.toLocaleDateString("fr-FR")} />
          <Champ label="Date de fin" valeur={contrat.dateFin.toLocaleDateString("fr-FR")} />
          <Champ label="Renouvellement auto" valeur={contrat.renouvellementAuto ? "Oui" : "Non"} />
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Champ
            label="Services couverts"
            valeur={
              contrat.services.length > 0
                ? contrat.services.map((s) => libellesService[s] ?? s).join(", ")
                : "—"
            }
          />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
          <ContratActions
            contratId={contrat.id}
            statut={contrat.statut}
            type={contrat.type}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Interventions liées</h3>
        <ul className="space-y-2">
          {interventions.map((i) => (
            <li key={i.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <Link href={`/admin/interventions/${i.id}`} className="font-medium text-jedco hover:underline">
                {i.reference}
              </Link>{" "}
              — {libellesService[i.type] ?? i.type} — {LIBELLE_STATUT_INTERVENTION[i.statut] ?? i.statut}
            </li>
          ))}
          {interventions.length === 0 && <li className="text-sm text-slate-400">Aucune intervention.</li>}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-jedco-dark">Factures liées</h3>
        <ul className="space-y-2">
          {factures.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              {f.reference} — {formatHTG(f.totalHTG)} — {LIBELLE_STATUT_FACTURE[f.statut] ?? f.statut}
            </li>
          ))}
          {factures.length === 0 && <li className="text-sm text-slate-400">Aucune facture.</li>}
        </ul>
      </div>
    </div>
  );
}
