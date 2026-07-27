"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";

export type Utilisateur = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
};

const LIBELLES_ROLE: Record<string, string> = {
  ADMIN: "Administrateur",
  SUPERVISEUR: "Superviseur",
  TECHNICIEN: "Technicien",
  SUPPORT: "Support client",
};

const LONGUEUR_MIN = 12;
const LONGUEUR_GENEREE = 16;
// Sans I/l/1 ni O/0 : ce mot de passe est destiné à être lu à voix haute ou
// recopié depuis un papier, pas collé depuis un gestionnaire.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genererMotDePasse(): string {
  const octets = new Uint32Array(LONGUEUR_GENEREE);
  crypto.getRandomValues(octets);
  return Array.from(octets, (n) => ALPHABET[n % ALPHABET.length]).join("");
}

export default function UtilisateursTable({
  utilisateurs,
  idCourant,
}: {
  utilisateurs: Utilisateur[];
  idCourant: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<{ email: string; motDePasse: string } | null>(null);

  function ouvrir(id: string) {
    setOuvert(id);
    setNouveau(genererMotDePasse());
    setErreur(null);
    setSucces(null);
  }

  async function reinitialiser(u: Utilisateur) {
    if (nouveau.length < LONGUEUR_MIN) {
      setErreur(`Le mot de passe doit faire au moins ${LONGUEUR_MIN} caractères.`);
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/utilisateurs/${u.id}/mot-de-passe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nouveau }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Réinitialisation impossible.");
        return;
      }
      // Le mot de passe n'est affiché qu'ici, une seule fois : il n'est
      // stocké nulle part en clair et ne peut plus être relu ensuite.
      setSucces({ email: u.email, motDePasse: nouveau });
      setOuvert(null);
      setNouveau("");
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerActivation(u: Utilisateur) {
    const question = u.actif
      ? `Désactiver le compte de ${u.prenom} ${u.nom} ?\n\nIl sera déconnecté immédiatement et ne pourra plus se connecter. Son historique est conservé.`
      : `Réactiver le compte de ${u.prenom} ${u.nom} ?`;
    if (!confirm(question)) return;

    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch(`/api/utilisateurs/${u.id}/activation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !u.actif }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Modification impossible.");
        return;
      }
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-4">
      {erreur && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}

      {succes && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">Mot de passe réinitialisé</p>
          <p className="mt-1 text-xs text-emerald-700">
            Communiquez-le à {succes.email} — il ne sera plus affiché après avoir quitté cette page.
            Demandez-lui de le changer depuis <strong>Mon profil</strong> dès sa connexion.
          </p>
          <p className="mt-2 select-all rounded border border-emerald-300 bg-white px-3 py-2 font-mono text-sm text-jedco-dark">
            {succes.motDePasse}
          </p>
          <button
            onClick={() => setSucces(null)}
            className="mt-2 text-xs font-medium text-emerald-700 underline"
          >
            J&apos;ai noté, masquer
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Rôle</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {utilisateurs.map((u) => (
              <Fragment key={u.id}>
              <tr className={u.actif ? "" : "bg-slate-50/60 text-slate-400"}>
                <td className="px-4 py-3 font-medium text-jedco-dark">
                  {u.prenom} {u.nom}
                  {u.id === idCourant && (
                    <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      vous
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{LIBELLES_ROLE[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {u.actif ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.id === idCourant ? (
                    <span className="text-xs text-slate-400">Voir Mon profil</span>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => (ouvert === u.id ? setOuvert(null) : ouvrir(u.id))}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Réinitialiser
                      </button>
                      <button
                        onClick={() => basculerActivation(u)}
                        disabled={envoi}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        {u.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>

              {ouvert === u.id && (
                <tr className="bg-slate-50">
                  <td colSpan={5} className="px-4 py-4">
                    <p className="text-xs text-slate-600">
                      Nouveau mot de passe pour <strong>{u.prenom} {u.nom}</strong>. Un mot de passe
                      solide est proposé — vous pouvez le remplacer.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        value={nouveau}
                        onChange={(e) => setNouveau(e.target.value)}
                        className="w-72 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-jedco"
                      />
                      <button
                        type="button"
                        onClick={() => setNouveau(genererMotDePasse())}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        En générer un autre
                      </button>
                      <button
                        type="button"
                        onClick={() => reinitialiser(u)}
                        disabled={envoi}
                        className="rounded-lg bg-jedco px-4 py-2 text-xs font-semibold text-white hover:bg-jedco-light disabled:opacity-60"
                      >
                        {envoi ? "Réinitialisation…" : "Confirmer"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOuvert(null)}
                        className="text-xs text-slate-500 underline"
                      >
                        Annuler
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {u.prenom} sera déconnecté de tous ses appareils.
                    </p>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
