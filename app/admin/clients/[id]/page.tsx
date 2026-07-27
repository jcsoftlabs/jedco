import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { obtenirClient, statsClient } from "@/lib/services/clients";
import { prisma } from "@/lib/db";
import { formatHTG } from "@/lib/money";
import ModifierClientForm from "./ModifierClientForm";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const { id } = await params;
  const client = await obtenirClient(id);
  if (!client) notFound();

  const [stats, contrats, interventions, factures, devis, toilettes] = await Promise.all([
    statsClient(id),
    prisma.contrat.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.intervention.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.facture.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { dateEmission: "desc" }, take: 20 }),
    prisma.devis.findMany({ where: { clientId: id, deletedAt: null }, orderBy: { dateEmission: "desc" }, take: 20 }),
    // Pas de deletedAt sur ToiletteMobile.client : le lien se coupe déjà
    // quand la location se termine (terminerLocation remet clientId à null),
    // donc ce qui reste ici EST la location en cours, s'il y en a une.
    prisma.toiletteMobile.findMany({ where: { clientId: id, deletedAt: null } }),
  ]);

  // Journal d'audit scopé à la fiche client elle-même (création, édition,
  // activation/désactivation) — pas aux factures/contrats/devis qui lui sont
  // liés, ce qui demanderait de croiser plusieurs types d'entités. Un lien
  // vers le journal complet, filtré par ce client, permet d'aller plus loin.
  const journal = await prisma.auditLog.findMany({
    where: { entityType: "Client", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: { select: { nom: true, prenom: true } } },
  });

  return (
    <div className="max-w-4xl">
        <Link href="/admin/clients" className="text-sm text-jedco hover:underline">
          ← Clients
        </Link>
        <h2 className="mt-2 text-xl font-bold text-jedco-dark">
          {client.nom} <span className="font-normal text-slate-400">({client.code})</span>
        </h2>
        <ModifierClientForm
          client={{
            id: client.id,
            nom: client.nom,
            type: client.type,
            telephone: client.telephone,
            ville: client.ville,
            adresse: client.adresse,
            email: client.email,
          }}
        />

        {stats && (
          <div className="mt-4 flex gap-6 text-sm">
            <span>
              <span className="font-semibold">{stats.totalInterventions}</span> interventions
            </span>
            <span>
              <span className="font-semibold">{stats.totalFactures}</span> factures
            </span>
            <span>
              Montant dû : <span className="font-semibold">{formatHTG(stats.montantDuHTG)}</span>
            </span>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">Contrats</h3>
          <Link
            href={`/admin/contrats?clientId=${client.id}`}
            className="text-sm rounded-lg bg-jedco px-3 py-1.5 text-white hover:bg-jedco-light transition"
          >
            + Nouveau contrat
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {contrats.map((c) => (
            <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              {c.reference} — {c.type} — {formatHTG(c.montantHTG)} — {c.statut}
            </li>
          ))}
          {contrats.length === 0 && <li className="text-sm text-slate-400">Aucun contrat.</li>}
        </ul>

        <div className="mt-8">
          <h3 className="font-semibold text-jedco-dark">Interventions récentes</h3>
          <ul className="mt-3 space-y-2">
            {interventions.map((i) => (
              <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                {i.reference} — {i.type} — {i.statut}
              </li>
            ))}
            {interventions.length === 0 && <li className="text-sm text-slate-400">Aucune intervention.</li>}
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">Factures</h3>
          <Link href={`/admin/factures?clientId=${client.id}`} className="text-sm text-jedco hover:underline">
            Voir dans Facturation →
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {factures.map((f) => (
            <li key={f.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              {f.reference} — {formatHTG(f.totalHTG)} — {f.statut} — échéance{" "}
              {f.dateEcheance.toLocaleDateString("fr-FR")}
            </li>
          ))}
          {factures.length === 0 && <li className="text-sm text-slate-400">Aucune facture.</li>}
        </ul>

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">Devis</h3>
          <Link href={`/admin/devis?clientId=${client.id}`} className="text-sm text-jedco hover:underline">
            Voir dans Devis →
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {devis.map((d) => (
            <li key={d.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              {d.reference} — {formatHTG(d.totalHTG)} — {d.statut} — valable jusqu&apos;au{" "}
              {d.dateValidite.toLocaleDateString("fr-FR")}
            </li>
          ))}
          {devis.length === 0 && <li className="text-sm text-slate-400">Aucun devis.</li>}
        </ul>

        <div className="mt-8">
          <h3 className="font-semibold text-jedco-dark">Toilette mobile louée</h3>
          <ul className="mt-3 space-y-2">
            {toilettes.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                {t.code}
                {t.dateDebutLocation && (
                  <>
                    {" "}
                    — depuis le {t.dateDebutLocation.toLocaleDateString("fr-FR")}
                    {t.dateFinLocation && ` jusqu'au ${t.dateFinLocation.toLocaleDateString("fr-FR")}`}
                  </>
                )}
              </li>
            ))}
            {toilettes.length === 0 && <li className="text-sm text-slate-400">Aucune location en cours.</li>}
          </ul>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">Historique de la fiche</h3>
          <Link href={`/admin/journal?q=${encodeURIComponent(client.code)}`} className="text-sm text-jedco hover:underline">
            Voir dans le journal d&apos;audit →
          </Link>
        </div>
        <ul className="mt-3 space-y-2">
          {journal.map((entree) => (
            <li key={entree.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
              <span className="font-mono text-xs text-jedco-dark">{entree.action}</span>
              {entree.user && (
                <span>
                  {" "}
                  par {entree.user.prenom} {entree.user.nom}
                </span>
              )}
              <span className="text-slate-400"> — {entree.createdAt.toLocaleString("fr-FR", { hour12: true })}</span>
            </li>
          ))}
          {journal.length === 0 && <li className="text-sm text-slate-400">Aucune modification enregistrée.</li>}
        </ul>
    </div>
  );
}
