"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { jouerBip } from "@/lib/notifications-audio";

const INTERVALLE_MS = 45_000;
const DUREE_TOAST_MS = 10_000;

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

type InterventionNonFacturee = {
  id: string;
  reference: string;
  dateExecution: string | null;
  client: { nom: string };
};

type ConversationEnAttente = {
  id: string;
  nom: string | null;
  updatedAt: string;
};

type Toast = {
  id: string;
  categorie: string;
  titre: string;
  message: string;
  couleur: string;
  icone: React.ReactNode;
  onClick: () => void;
};

// Repère quels éléments d'un fetch n'avaient jamais été vus (par id) — sert à
// distinguer une NOUVELLE arrivée (déclenche un toast) du simple rappel d'un
// élément déjà connu à chaque sondage. `vus` est modifié en place (Set
// partagé entre appels via une ref), pas immuable par choix : recréer un Set
// de 0 à chaque sondage de 45s n'apporterait rien ici.
function detecterNouveaux<T extends { id: string }>(items: T[], vus: Set<string>): T[] {
  const nouveaux = items.filter((it) => !vus.has(it.id));
  for (const it of items) vus.add(it.id);
  return nouveaux;
}

function IconeToast({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={d} />
    </svg>
  );
}

const TRACE_DEMANDE = "M4 5h16M4 12h16M4 19h10";
const TRACE_RDV = "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z";
const TRACE_CONTRAT = "M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M8 3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M9 12h6M9 16h4";
const TRACE_VEHICULE = "M3 12h13l3 4h2v3h-2M3 12V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v5M3 12v7h2M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z";
const TRACE_FACTURE = "M14 3v5h5M8 13h8M8 17h5M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z";
const TRACE_SUPPORT = "M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-3.67-.68L3 21l1.87-4.05A7.64 7.64 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z";

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
  const [nonFacturees, setNonFacturees] = useState<InterventionNonFacturee[]>([]);
  const [totalNonFacturees, setTotalNonFacturees] = useState(0);
  const [conversationsEnAttente, setConversationsEnAttente] = useState<ConversationEnAttente[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [monte, setMonte] = useState(false);

  // Sets vides mémorisés une seule fois (pas recréés à chaque rendu) — un
  // par source, pour ne comparer que des éléments de même nature entre eux.
  const vusRef = useRef({
    demandes: new Set<string>(),
    entretiens: new Set<string>(),
    rdv: new Set<string>(),
    contrats: new Set<string>(),
    nonFacturees: new Set<string>(),
    conversations: new Set<string>(),
  });
  // Le tout premier sondage établit juste la ligne de base (ce qui existait
  // déjà) — sans ce garde-fou, se connecter avec 5 demandes déjà en attente
  // ferait apparaître 5 toasts d'un coup, comme si elles venaient d'arriver.
  const premierSondageRef = useRef(true);

  function ajouterToasts(nouveaux: Omit<Toast, "id">[]) {
    if (nouveaux.length === 0) return;
    const horodates = nouveaux.map((t, i) => ({ ...t, id: `${Date.now()}-${i}-${Math.random()}` }));
    setToasts((prev) => [...horodates, ...prev]);
    jouerBip();
    for (const t of horodates) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, DUREE_TOAST_MS);
    }
  }

  function fermerToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function verifier() {
    const estPremierSondage = premierSondageRef.current;
    const nouveauxToasts: Omit<Toast, "id">[] = [];

    try {
      const res = await fetch("/api/demandes-devis?traite=false&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setDemandes(data.data);
        setTotal(data.meta?.total ?? data.data.length);
        const nouveaux = detecterNouveaux<Demande>(data.data, vusRef.current.demandes);
        if (!estPremierSondage) {
          for (const d of nouveaux) {
            nouveauxToasts.push({
              categorie: "Nouvelle demande",
              titre: d.nom,
              message: `Demande de devis à ${d.ville}`,
              couleur: "bg-jedco",
              icone: <IconeToast d={TRACE_DEMANDE} />,
              onClick: () => ouvrirDemande(d.id),
            });
          }
        }
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
      if (data.success) {
        setEntretiens(data.data);
        const nouveaux = detecterNouveaux<EntretienDu>(data.data, vusRef.current.entretiens);
        if (!estPremierSondage) {
          for (const v of nouveaux) {
            nouveauxToasts.push({
              categorie: "Entretien à prévoir",
              titre: v.immatriculation,
              message: `Entretien ${new Date(v.prochainEntretien).getTime() < Date.now() ? "en retard depuis" : "prévu pour"} le ${new Date(v.prochainEntretien).toLocaleDateString("fr-FR")}`,
              couleur: "bg-amber-500",
              icone: <IconeToast d={TRACE_VEHICULE} />,
              onClick: ouvrirVehicule,
            });
          }
        }
      }
    } catch {
      // Silencieux, même raison.
    }

    try {
      const res = await fetch("/api/rendez-vous?statut=EN_ATTENTE&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setRendezVous(data.data);
        setTotalRdv(data.meta?.total ?? data.data.length);
        const nouveaux = detecterNouveaux<RendezVousEnAttente>(data.data, vusRef.current.rdv);
        if (!estPremierSondage) {
          for (const r of nouveaux) {
            nouveauxToasts.push({
              categorie: "Rendez-vous à confirmer",
              titre: r.nom,
              message: `Souhaité le ${new Date(r.dateVoulue).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", hour12: true })}`,
              couleur: "bg-blue-600",
              icone: <IconeToast d={TRACE_RDV} />,
              onClick: ouvrirRendezVous,
            });
          }
        }
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
        const nouveaux = detecterNouveaux<ContratExpirant>(data.data, vusRef.current.contrats);
        if (!estPremierSondage) {
          for (const c of nouveaux) {
            nouveauxToasts.push({
              categorie: "Contrat à renouveler",
              titre: c.client.nom,
              message: `${c.reference} — échéance le ${new Date(c.dateFin).toLocaleDateString("fr-FR")}`,
              couleur: "bg-amber-500",
              icone: <IconeToast d={TRACE_CONTRAT} />,
              onClick: ouvrirContrat,
            });
          }
        }
      }
    } catch {
      // Silencieux, même raison.
    }

    try {
      const res = await fetch("/api/interventions?nonFacturees=true&page=1&limit=5");
      const data = await res.json();
      if (data.success) {
        setNonFacturees(data.data);
        setTotalNonFacturees(data.meta?.total ?? data.data.length);
        const nouveaux = detecterNouveaux<InterventionNonFacturee>(data.data, vusRef.current.nonFacturees);
        if (!estPremierSondage) {
          for (const i of nouveaux) {
            nouveauxToasts.push({
              categorie: "Terminée non facturée",
              titre: i.client.nom,
              message: `${i.reference} — prête à facturer`,
              couleur: "bg-amber-500",
              icone: <IconeToast d={TRACE_FACTURE} />,
              onClick: ouvrirInterventionNonFacturee,
            });
          }
        }
      }
    } catch {
      // Silencieux, même raison.
    }

    try {
      // /api/support/conversations exige ADMIN ou SUPPORT (pas SUPERVISEUR)
      // — un 403 pour un superviseur est attendu, pas une erreur : il ne
      // verra simplement pas cette section, comme prévu par l'échec
      // silencieux déjà en place pour les autres sources ci-dessus.
      const res = await fetch("/api/support/conversations");
      const data = await res.json();
      if (data.success) {
        setConversationsEnAttente(data.data.enAttente);
        const nouveaux = detecterNouveaux<ConversationEnAttente>(data.data.enAttente, vusRef.current.conversations);
        if (!estPremierSondage) {
          for (const c of nouveaux) {
            nouveauxToasts.push({
              categorie: "Client en attente d'un agent",
              titre: c.nom ?? "Visiteur anonyme",
              message: "Demande à parler à un agent — répondez dès que possible.",
              couleur: "bg-red-500",
              icone: <IconeToast d={TRACE_SUPPORT} />,
              onClick: ouvrirSupport,
            });
          }
        }
      }
    } catch {
      // Silencieux, même raison.
    }

    premierSondageRef.current = false;
    ajouterToasts(nouveauxToasts);
  }

  useEffect(() => {
    setMonte(true);
    verifier();
    const id = setInterval(verifier, INTERVALLE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function ouvrirInterventionNonFacturee() {
    setOuvert(false);
    router.push("/admin/interventions?nonFacturees=true");
  }

  function ouvrirSupport() {
    setOuvert(false);
    router.push("/admin/support");
  }

  // Un seul badge numérique, six sources : la cloche répond à « ai-je
  // quelque chose à traiter ? », pas « combien de types de choses ». Séparer
  // les compteurs en plusieurs badges aurait forcé l'admin à faire l'addition
  // lui-même pour savoir s'il y a urgence.
  const totalCombine =
    total + entretiens.length + totalRdv + totalContrats + totalNonFacturees + conversationsEnAttente.length;

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

      {/* Portail vers document.body : les toasts flottent au-dessus de tout
          l'écran (coin haut-droit), indépendamment de la position de la
          cloche dans la barre latérale — un positionnement relatif à
          conteneurRef les aurait coupés par l'overflow du menu mobile. */}
      {monte &&
        createPortal(
          <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
            {toasts.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  fermerToast(t.id);
                  t.onClick();
                }}
                className="toast-entree pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg transition hover:shadow-xl"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${t.couleur}`}>
                  {t.icone}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t.categorie}
                  </span>
                  <span className="block truncate text-sm font-semibold text-jedco-dark">{t.titre}</span>
                  <span className="line-clamp-2 text-xs text-slate-500">{t.message}</span>
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-1 h-4 w-4 shrink-0 self-center text-slate-300"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            ))}
          </div>,
          document.body
        )}

      {ouvert && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          {conversationsEnAttente.length > 0 && (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 bg-red-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-red-800">Client en attente d&apos;un agent</span>
                <span className="text-xs text-red-600">{conversationsEnAttente.length}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {conversationsEnAttente.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={ouvrirSupport}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-jedco-dark">{c.nom ?? "Visiteur anonyme"}</p>
                      <p className="text-xs text-slate-500">
                        Depuis{" "}
                        {new Date(c.updatedAt).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          hour12: true,
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/admin/support"
                  onClick={() => setOuvert(false)}
                  className="text-xs font-medium text-jedco hover:underline"
                >
                  Voir toutes les conversations
                </Link>
              </div>
            </>
          )}

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
                        Souhaité le{" "}
                        {new Date(r.dateVoulue).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          hour12: true,
                        })}
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

          {nonFacturees.length > 0 && (
            <>
              <div className="flex items-center justify-between border-t border-b border-slate-100 bg-amber-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-amber-800">Terminées non facturées</span>
                <span className="text-xs text-amber-600">{totalNonFacturees}</span>
              </div>
              <ul className="max-h-60 overflow-y-auto">
                {nonFacturees.map((i) => (
                  <li key={i.id}>
                    <button
                      onClick={ouvrirInterventionNonFacturee}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    >
                      <p className="font-medium text-jedco-dark">
                        {i.reference} <span className="font-normal text-slate-500">— {i.client.nom}</span>
                      </p>
                      {i.dateExecution && (
                        <p className="text-xs text-slate-500">
                          Terminée le {new Date(i.dateExecution).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2">
                <Link
                  href="/admin/interventions?nonFacturees=true"
                  onClick={() => setOuvert(false)}
                  className="text-xs font-medium text-jedco hover:underline"
                >
                  Voir toutes les interventions non facturées
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
