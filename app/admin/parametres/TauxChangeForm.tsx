"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Un écart important par rapport au taux en place est presque toujours une
// faute de frappe (virgule oubliée, chiffre en trop). On ne bloque pas — la
// gourde peut réellement décrocher — mais on demande confirmation.
const SEUIL_ALERTE_POURCENT = 20;

export default function TauxChangeForm({
  valeurActuelle,
  misAJourLe,
  estAdmin,
}: {
  valeurActuelle: number | null;
  misAJourLe: string | null;
  estAdmin: boolean;
}) {
  const router = useRouter();
  const [valeur, setValeur] = useState(valeurActuelle !== null ? String(valeurActuelle) : "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    const nombre = Number(valeur.replace(",", "."));
    if (!Number.isFinite(nombre) || nombre <= 0) {
      setErreur("Saisissez un nombre positif (ex : 132,5).");
      return;
    }

    if (valeurActuelle !== null) {
      const ecart = Math.abs((nombre - valeurActuelle) / valeurActuelle) * 100;
      if (ecart > SEUIL_ALERTE_POURCENT) {
        const ok = confirm(
          `Le nouveau taux (${nombre}) s'écarte de ${Math.round(ecart)} % du taux actuel (${valeurActuelle}).\n\n` +
            `Il sera figé sur toutes les factures émises ensuite. Confirmer ?`
        );
        if (!ok) return;
      }
    }

    setEnvoi(true);
    try {
      const res = await fetch("/api/config/taux-usd", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valeur: nombre }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setMessage("Taux enregistré.");
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function desactiver() {
    if (!confirm("Retirer l'équivalent en dollars des prochaines factures et devis ?\n\nLes documents déjà émis gardent leur taux figé.")) return;
    setErreur(null);
    setMessage(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/config/taux-usd", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setValeur("");
      setMessage("Affichage en dollars désactivé.");
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">Taux de change HTG / USD</h3>
      <p className="mt-1 text-xs text-slate-500">
        Sert à afficher un équivalent indicatif en dollars sur les factures et devis. Le taux en
        vigueur est <strong>figé sur chaque document au moment de son émission</strong> : le modifier
        ici ne change jamais un document déjà émis.
      </p>

      <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3">
        {valeurActuelle !== null ? (
          <>
            <p className="text-lg font-bold tabular-nums text-jedco-dark">
              1 USD = {valeurActuelle} HTG
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {misAJourLe
                ? `Dernière mise à jour : ${new Date(misAJourLe).toLocaleString("fr-FR", { hour12: true })}`
                : "Date de mise à jour inconnue"}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Aucun taux défini — les factures et devis n&apos;affichent pas d&apos;équivalent en dollars.
          </p>
        )}
      </div>

      {estAdmin ? (
        <>
          <form onSubmit={enregistrer} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="taux" className="mb-1 block text-xs font-medium text-slate-600">
                Nouveau taux (HTG pour 1 USD)
              </label>
              <input
                id="taux"
                inputMode="decimal"
                value={valeur}
                onChange={(e) => setValeur(e.target.value)}
                placeholder="Ex : 132,5"
                className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums outline-none focus:border-jedco"
              />
            </div>
            <button
              type="submit"
              disabled={envoi || !valeur.trim()}
              className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
            >
              {envoi ? "Enregistrement…" : "Enregistrer"}
            </button>
            {valeurActuelle !== null && (
              <button
                type="button"
                onClick={desactiver}
                disabled={envoi}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                Ne plus afficher en USD
              </button>
            )}
          </form>

          {erreur && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erreur}
            </p>
          )}
          {message && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-xs text-slate-400">
          Seul un administrateur peut modifier ce taux.
        </p>
      )}
    </section>
  );
}
