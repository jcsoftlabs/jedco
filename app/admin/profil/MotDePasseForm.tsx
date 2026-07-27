"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LONGUEUR_MIN = 12;

export default function MotDePasseForm() {
  const router = useRouter();
  const [actuel, setActuel] = useState("");
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Vérifiée ici ET côté serveur (changerMotDePasseSchema) : ce contrôle-ci
  // n'est qu'un confort de saisie, jamais la garantie.
  const assezLong = nouveau.length >= LONGUEUR_MIN;
  const concordent = nouveau.length > 0 && nouveau === confirmation;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    if (!assezLong) {
      setErreur(`Le nouveau mot de passe doit faire au moins ${LONGUEUR_MIN} caractères.`);
      return;
    }
    if (!concordent) {
      setErreur("Les deux saisies du nouveau mot de passe ne correspondent pas.");
      return;
    }

    setEnvoi(true);
    try {
      const res = await fetch("/api/auth/mot-de-passe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actuel, nouveau }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Modification impossible.");
        return;
      }
      setActuel("");
      setNouveau("");
      setConfirmation("");
      setMessage(data.message ?? "Mot de passe modifié.");
      router.refresh();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">Changer mon mot de passe</h3>
      <p className="mt-1 text-xs text-slate-500">
        Vos sessions ouvertes sur vos <strong>autres</strong> appareils seront fermées. Vous resterez
        connecté ici.
      </p>

      <form onSubmit={envoyer} className="mt-4 max-w-sm space-y-3">
        <div>
          <label htmlFor="actuel" className="mb-1 block text-xs font-medium text-slate-600">
            Mot de passe actuel
          </label>
          <input
            id="actuel"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            required
            value={actuel}
            onChange={(e) => setActuel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>

        <div>
          <label htmlFor="nouveau" className="mb-1 block text-xs font-medium text-slate-600">
            Nouveau mot de passe
          </label>
          <input
            id="nouveau"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            required
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
          <p className={`mt-1 text-xs ${nouveau && !assezLong ? "text-red-600" : "text-slate-400"}`}>
            {LONGUEUR_MIN} caractères minimum.
          </p>
        </div>

        <div>
          <label htmlFor="confirmation" className="mb-1 block text-xs font-medium text-slate-600">
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="confirmation"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
          {confirmation.length > 0 && !concordent && (
            <p className="mt-1 text-xs text-red-600">Les deux saisies diffèrent.</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
          Afficher les mots de passe
        </label>

        <button
          type="submit"
          disabled={envoi || !actuel || !assezLong || !concordent}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
        >
          {envoi ? "Modification…" : "Modifier mon mot de passe"}
        </button>
      </form>

      {erreur && (
        <p className="mt-3 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erreur}
        </p>
      )}
      {message && (
        <p className="mt-3 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
    </section>
  );
}
