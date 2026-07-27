"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tache = { nom: string; ok: boolean; detail: string };

export default function TachesPanel({
  derniereExecution,
  estAdmin,
}: {
  derniereExecution: { date: string; declencheur: string; taches: Tache[] } | null;
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function lancer() {
    if (
      !confirm(
        "Exécuter les traitements maintenant ?\n\n" +
          "Les factures des contrats récurrents dus ce mois-ci seront émises. " +
          "L'opération est sans risque si elle a déjà tourné : un contrat déjà facturé pour la période est ignoré."
      )
    )
      return;

    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/cron/taches-quotidiennes", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Exécution impossible.");
        return;
      }
      setMessage("Traitements exécutés.");
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">Traitements automatiques</h3>
      <p className="mt-1 text-xs text-slate-500">
        Chaque nuit, le système émet les factures des contrats récurrents arrivés à échéance, passe
        les factures dépassées en <strong>En retard</strong> et clôt les contrats arrivés à leur
        terme. Rien à faire au quotidien — cet encadré sert à vérifier que le lot est bien passé.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        {derniereExecution ? (
          <>
            <p className="text-sm font-medium text-jedco-dark">
              Dernière exécution : {new Date(derniereExecution.date).toLocaleString("fr-FR")}
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({derniereExecution.declencheur === "manuel" ? "manuelle" : "automatique"})
              </span>
            </p>
            <ul className="mt-2 space-y-1">
              {derniereExecution.taches.map((t) => (
                <li key={t.nom} className="flex items-start gap-2 text-xs">
                  <span className={t.ok ? "text-emerald-600" : "text-red-600"}>{t.ok ? "✓" : "✕"}</span>
                  <span className="text-slate-600">
                    <strong className="font-medium text-slate-700">{t.nom}</strong> — {t.detail}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-amber-700">
            Le lot n&apos;a encore jamais tourné. S&apos;il ne s&apos;affiche toujours rien demain
            matin, la variable <code className="rounded bg-white px-1">CRON_SECRET</code> est
            probablement absente de la configuration du déploiement.
          </p>
        )}
      </div>

      {estAdmin && (
        <div className="mt-4">
          <button
            onClick={lancer}
            disabled={envoi}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {envoi ? "Exécution…" : "Exécuter maintenant"}
          </button>
          <p className="mt-1.5 text-xs text-slate-400">
            À utiliser si le lot d&apos;une nuit a été manqué. Sans effet si tout est déjà à jour.
          </p>
        </div>
      )}

      {erreur && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}
      {message && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
    </section>
  );
}
