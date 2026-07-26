import { redirect } from "next/navigation";
import { clientCourant } from "@/lib/auth/current-client";
import { documentsClient } from "@/lib/services/auth-client";
import { formatHTG } from "@/lib/money";
import DeconnexionButton from "./DeconnexionButton";

const COULEUR_STATUT_FACTURE: Record<string, string> = {
  EN_ATTENTE: "bg-slate-100 text-slate-700",
  PARTIELLEMENT_PAYEE: "bg-amber-100 text-amber-700",
  PAYEE: "bg-emerald-100 text-emerald-700",
  EN_RETARD: "bg-red-100 text-red-700",
  ANNULEE: "bg-slate-200 text-slate-500",
};

const COULEUR_STATUT_DEVIS: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-700",
  ENVOYE: "bg-blue-100 text-blue-700",
  ACCEPTE: "bg-emerald-100 text-emerald-700",
  REFUSE: "bg-red-100 text-red-700",
  EXPIRE: "bg-slate-200 text-slate-500",
  CONVERTI: "bg-jedco/10 text-jedco",
};

export default async function EspaceClientPage() {
  const client = await clientCourant();
  if (!client) redirect("/espace-client/connexion");

  const { factures, devis } = await documentsClient(client.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Espace client</p>
            <h1 className="text-lg font-semibold text-jedco-dark">{client.nom}</h1>
          </div>
          <DeconnexionButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes factures</h2>
          {factures.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
              Aucune facture pour l&apos;instant.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Émise le</th>
                    <th className="px-4 py-3">Échéance</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factures.map((f) => (
                    <tr key={f.id}>
                      <td className="px-4 py-3 font-medium text-jedco-dark">{f.reference}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(f.dateEmission).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(f.dateEcheance).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_FACTURE[f.statut]}`}
                        >
                          {f.statut.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatHTG(f.totalHTG)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/espace-client/factures/${f.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-jedco hover:underline"
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes devis</h2>
          {devis.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-400">
              Aucun devis pour l&apos;instant.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Émis le</th>
                    <th className="px-4 py-3">Valide jusqu&apos;au</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devis.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3 font-medium text-jedco-dark">{d.reference}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(d.dateEmission).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(d.dateValidite).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COULEUR_STATUT_DEVIS[d.statut]}`}
                        >
                          {d.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatHTG(d.totalHTG)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/api/espace-client/devis/${d.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-jedco hover:underline"
                        >
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
