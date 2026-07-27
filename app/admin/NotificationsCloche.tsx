"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const INTERVALLE_MS = 45_000;

type Demande = {
  id: string;
  nom: string;
  ville: string;
  createdAt: string;
};

type EntretienDu = {
  id: string;
  immatriculation: string;
  prochainEntretien: string;
};

type RendezVousEnAttente = {
  id: string;
  nom: string;
  dateVoulue: string;
};

type ContratExpirant = {
  id: string;
  reference: string;
  dateFin: string;
  client: { nom: string };
};

export default function NotificationsCloche() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [total, setTotal] = useState(0);
  const [entretiens, setEntretiens] = useState<EntretienDu[]>([]);
  const [rendezVous, setRendezVous] = useState<RendezVousEnAttente[]>([]);
  const [totalRdv, setTotalRdv] = useState(0);
  const [contratsExpirants, setContratsExpirants] = useState<ContratExpirant[]>([]);
  const [totalContrats, setTotalContrats] = useState(0);
  const conteneurRef = useRef<HTMLDivElement>(null);

  async function verifier() {
    try {
      const res = await fetch("/api/demandes-devis?traite=false&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setDemandes(data.data);
        setTotal(data.meta?.total ?? data.data.length);
      }
    } catch {
      // Silencieux : une vérification manquée ne doit pas perturber l'admin,
      // la suivante rattrapera dans INTERVALLE_MS.
    }

    // Requête séparée, sur un point d'entrée séparé : un échec ici (droits
    // insuffisants pour un futur rôle, endpoint temporairement indisponible)
    // ne doit pas priver l'admin des nouvelles demandes de devis ci-dessus.
    try {
      const res = await fetch("/api/vehicules/entretiens-dus");
      const data = await res.json();
      if (data.success) setEntretiens(data.data);
    } catch {
      // Silencieux, même raison.
    }

    try {
      const res = await fetch("/api/rendez-vous?statut=EN_ATTENTE&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setRendezVous(data.data);
        setTotalRdv(data.meta?.total ?? data.data.length);
      }
    } catch {
      // Silencieux, même raison.
    }

    try {
      // 30 jours : même seuil que le premier palier des alertes par e-mail
      // envoyées la nuit (voir lib/services/alertes-contrats.ts) — la cloche
      // et l'e-mail signalent la même fenêtre, pas deux définitions
      // différentes de « bientôt ».
      const res = await fetch("/api/contrats?expirantDansJours=30&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setContratsExpirants(data.data);
        setTotalContrats(data.meta?.total ?? data.data.length);
      }
    } catch {
      // Silencieux, même raison.
    }
  }

  useEffect(() => {
    verifier();
    const id = setInterval(verifier, INTERVALLE_MS);
    return () => clearInterval(id);
  }, []);

  // Ferme le panneau au clic en dehors — comportement attendu d'un menu
  // déroulant, sinon il reste ouvert tant qu'on ne reclique pas la cloche.
  useEffect(() => {
    function onClickDehors(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickDehors);
    return () => document.removeEventListener("mousedown", onClickDehors);
  }, []);

  function ouvrirDemande(id: string) {
    setOuvert(false);
    router.push(`/admin/demandes?highlight=${id}`);
  }

  function ouvrirVehicule() {
    setOuvert(false);
    router.push("/admin/vehicules");
  }

  function ouvrirRendezVous() {
    setOuvert(false);
    router.push("/admin/demandes");
  }

  function ouvrirContrat() {
    setOuvert(false);
    router.push("/admin/contrats");
  }

  // Un seul badge numérique, quatre sources : la cloche répond à « ai-je
  // quelque chose à traiter ? », pas « combien de types de choses ». Séparer
  // les compteurs en plusieurs badges aurait forcé l'admin à faire l'addition
  // lui-même pour savoir s'il y a urgence.
  const totalCombine = total + entretiens.length + totalRdv + totalContrats;

  return (
    <div ref={conteneurRef} className="relative ml-auto">
      <button
        onClick={() => setOuvert((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {totalCombine > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalCombine > 9 ? "9+" : totalCombine}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-jedco-dark">Nouvelles demandes</span>
            {total > 0 && <span className="text-xs text-slate-400">{total} non traitée{total > 1 ? "s" : ""}</span>}
          </div>
          {demandes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">Aucune demande en attente.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {demandes.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => ouvrirDemande(d.id)}
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                  >
                    <p className="font-medium text-jedco-dark">{d.nom}</p>
                    <p className="text-xs text-slate-500">
                      {d.ville} · {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-slate-100 px-4 py-2">
            <Link
              href="/admin/demandes"
              onClick={() => setOuvert(false)}
              className="text-xs font-medium text-jedco hover:underline"
            >
              Voir toutes les demandes
            </Link>
          </div>

          {rendezVous.length > 0 && (
            <>
              <div className="flex items-center justify-between border-t border-b border-slate-100 px-4 py-2.5">
                <span className="text-sm font-semibold text-jedco-dark">Rendez-vous à confirmer</span>
                <span className="text-xs text-slate-400">{totalRdv}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {rendezVous.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={ouvrirRendezVous}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-jedco-dark">{r.nom}</p>
                      <p className="text-xs text-slate-500">
                        Souhaité le {new Date(r.dateVoulue).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/admin/demandes"
                  onClick={() => setOuvert(false)}
                  className="text-xs font-medium text-jedco hover:underline"
                >
                  Voir tous les rendez-vous
                </Link>
              </div>
            </>
          )}

          {contratsExpirants.length > 0 && (
            <>
              <div className="flex items-center justify-between border-t border-b border-slate-100 px-4 py-2.5">
                <span className="text-sm font-semibold text-jedco-dark">Contrats à renouveler</span>
                <span className="text-xs text-slate-400">{totalContrats}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {contratsExpirants.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={ouvrirContrat}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-jedco-dark">
                        {c.reference} <span className="font-normal text-slate-500">— {c.client.nom}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.dateFin).getTime() < Date.now() ? "Échu depuis le" : "Échéance le"}{" "}
                        {new Date(c.dateFin).toLocaleDateString("fr-FR")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/admin/contrats"
                  onClick={() => setOuvert(false)}
                  className="text-xs font-medium text-jedco hover:underline"
                >
                  Voir tous les contrats
                </Link>
              </div>
            </>
          )}

          {entretiens.length > 0 && (
            <>
              <div className="flex items-center justify-between border-t border-b border-slate-100 bg-amber-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-amber-800">Entretien à prévoir</span>
                <span className="text-xs text-amber-600">{entretiens.length}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {entretiens.map((v) => (
                  <li key={v.id}>
                    <button
                      onClick={ouvrirVehicule}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-jedco-dark">{v.immatriculation}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(v.prochainEntretien).getTime() < Date.now() ? "En retard depuis le" : "Prévu le"}{" "}
                        {new Date(v.prochainEntretien).toLocaleDateString("fr-FR")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/admin/vehicules"
                  onClick={() => setOuvert(false)}
                  className="text-xs font-medium text-jedco hover:underline"
                >
                  Voir la flotte
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
