"use client";

import { useEffect, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import NotificationsCloche from "./NotificationsCloche";
import SessionKeepAlive from "./SessionKeepAlive";

// `adminSeul` : le lien apparaît pour ADMIN mais pas pour SUPERVISEUR, qui
// partage par ailleurs la même navigation. Sans ce filtre, un superviseur
// verrait un lien qui le renvoie aussitôt au tableau de bord (la page fait
// requireRole ADMIN) — un cul-de-sac plutôt qu'une fonctionnalité.
type Lien = { href: string; label: string; icone: React.ReactNode; adminSeul?: boolean };

// Pages atteignables sans figurer dans la navigation latérale : le titre de
// l'en-tête les cherche ici, sinon il retomberait sur « Backoffice ».
const TITRES_HORS_NAV: Record<string, string> = {
  "/admin/profil": "Mon profil",
};

const CLE_REPLI = "jedco.sidebar.replie";

function Icone({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
      <path d={d} />
    </svg>
  );
}

const I = {
  accueil: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5",
  demandes: "M4 5h16M4 12h16M4 19h10",
  galerie: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  temoignages: "M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 1 1 18-4Z",
  clients: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.9",
  contrats: "M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M8 3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M9 12h6M9 16h4",
  interventions: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  terrain: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  techniciens: "M14.7 6.3a4 4 0 0 1 5.3 5.3l-2.6-2.6M14.7 6.3 4 17v3h3L17.4 9.6",
  factures: "M14 3v5h5M8 13h8M8 17h5M6 3h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
  devis: "M9 12h6m-6 4h4M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 5h6",
  catalogue: "M4 6h16M4 12h16M4 18h16M2.5 6h.01M2.5 12h.01M2.5 18h.01",
  parametres: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
  flotte: "M3 12h13l3 4h2v3h-2M3 12V7a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v5M3 12v7h2M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  support: "M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-3.67-.68L3 21l1.87-4.05A7.64 7.64 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z",
  manuel: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
  utilisateurs: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  profil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM6 21v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1",
  journal: "M9 12h6m-6 4h6M9 8h1M4 5.5A2.5 2.5 0 0 1 6.5 3H18a1 1 0 0 1 1 1v15.5a1.5 1.5 0 0 1-1.5 1.5H6.5A2.5 2.5 0 0 1 4 18.5v-13Z",
  presences: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
  toilettes: "M6 21v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8M9 3h6l1 4H8l1-4Z",
  rapports: "M3 3v18h18M7 15l4-4 3 3 5-6",
};

const LIENS_ADMIN: Lien[] = [
  { href: "/admin", label: "Tableau de bord", icone: <Icone d={I.accueil} /> },
  { href: "/admin/demandes", label: "Demandes", icone: <Icone d={I.demandes} /> },
  { href: "/admin/clients", label: "Clients", icone: <Icone d={I.clients} /> },
  { href: "/admin/contrats", label: "Contrats", icone: <Icone d={I.contrats} /> },
  { href: "/admin/interventions", label: "Interventions", icone: <Icone d={I.interventions} /> },
  { href: "/admin/terrain", label: "Terrain", icone: <Icone d={I.terrain} /> },
  { href: "/admin/techniciens", label: "Techniciens", icone: <Icone d={I.techniciens} /> },
  { href: "/admin/presences", label: "Présences", icone: <Icone d={I.presences} /> },
  { href: "/admin/vehicules", label: "Flotte", icone: <Icone d={I.flotte} /> },
  { href: "/admin/toilettes", label: "Toilettes mobiles", icone: <Icone d={I.toilettes} /> },
  { href: "/admin/factures", label: "Facturation", icone: <Icone d={I.factures} /> },
  { href: "/admin/devis", label: "Devis", icone: <Icone d={I.devis} /> },
  { href: "/admin/rapports", label: "Rapports", icone: <Icone d={I.rapports} /> },
  { href: "/admin/catalogue", label: "Catalogue", icone: <Icone d={I.catalogue} /> },
  { href: "/admin/galerie", label: "Galerie", icone: <Icone d={I.galerie} /> },
  { href: "/admin/temoignages", label: "Témoignages", icone: <Icone d={I.temoignages} /> },
  { href: "/admin/support", label: "Support", icone: <Icone d={I.support} /> },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icone: <Icone d={I.utilisateurs} />, adminSeul: true },
  { href: "/admin/journal", label: "Journal d'audit", icone: <Icone d={I.journal} />, adminSeul: true },
  { href: "/admin/parametres", label: "Paramètres", icone: <Icone d={I.parametres} /> },
  { href: "/admin/manuel", label: "Manuel", icone: <Icone d={I.manuel} /> },
];

// Un TECHNICIEN n'a accès qu'aux deux pages sans requireRole ADMIN/SUPERVISEUR
// — lui montrer les autres serait un cul-de-sac plutôt qu'une fonctionnalité.
const LIENS_TECHNICIEN: Lien[] = [
  { href: "/admin/terrain", label: "Terrain", icone: <Icone d={I.terrain} /> },
  { href: "/admin/interventions", label: "Interventions", icone: <Icone d={I.interventions} /> },
  { href: "/admin/manuel", label: "Manuel", icone: <Icone d={I.manuel} /> },
];

// Un SUPPORT (réceptionniste) n'a accès qu'au tableau de bord des
// conversations — jamais aux modules métier (factures, clients, etc.).
const LIENS_SUPPORT: Lien[] = [
  { href: "/admin/support", label: "Support", icone: <Icone d={I.support} /> },
  { href: "/admin/manuel", label: "Manuel", icone: <Icone d={I.manuel} /> },
];

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 shrink-0 animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Composant séparé parce que useLinkStatus doit être appelé DANS un descendant
// du <Link> auquel il se rapporte — appelé au niveau de la liste, il ne verrait
// aucune navigation. Il expose l'état "en attente" du lien cliqué, ce qui
// permet de remplacer son icône par un spinner : le repère est sur l'élément
// que l'admin vient de cliquer, pas seulement dans la zone de contenu.
function LienNav({ lien, actif, compact }: { lien: Lien; actif: boolean; compact: boolean }) {
  return (
    <Link
      href={lien.href}
      title={compact ? lien.label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        actif ? "bg-jedco text-white font-medium shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
      } ${compact ? "justify-center px-2" : ""}`}
    >
      <ContenuLienNav lien={lien} compact={compact} />
    </Link>
  );
}

function ContenuLienNav({ lien, compact }: { lien: Lien; compact: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Spinner className="h-5 w-5" /> : lien.icone}
      {!compact && <span className="truncate">{lien.label}</span>}
    </>
  );
}

export default function AdminShell({
  user,
  children,
}: {
  user: { nom: string; prenom: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [replie, setReplie] = useState(false);
  const [mobileOuvert, setMobileOuvert] = useState(false);

  // L'état de repli est restauré après le montage plutôt que pendant le rendu
  // initial : lire localStorage au premier rendu produirait un HTML serveur
  // (toujours déplié) différent du HTML client, donc une erreur d'hydratation.
  useEffect(() => {
    setReplie(localStorage.getItem(CLE_REPLI) === "1");
  }, []);

  function basculerRepli() {
    setReplie((v) => {
      localStorage.setItem(CLE_REPLI, v ? "0" : "1");
      return !v;
    });
  }

  // Referme le tiroir mobile à chaque navigation — sans ça il resterait
  // ouvert par-dessus la page qu'on vient d'atteindre.
  useEffect(() => {
    setMobileOuvert(false);
  }, [pathname]);

  const liens = (
    user.role === "TECHNICIEN" ? LIENS_TECHNICIEN : user.role === "SUPPORT" ? LIENS_SUPPORT : LIENS_ADMIN
  ).filter((l) => !l.adminSeul || user.role === "ADMIN");
  const initiales = `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();

  function estActif(href: string) {
    // "/admin" ne doit s'allumer que sur lui-même, sinon il resterait actif
    // sur toutes les sous-pages qui commencent par le même préfixe.
    return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  }

  // `compact` est un paramètre plutôt que l'état `replie` lu directement : le
  // tiroir mobile fait toujours 256px de large, il doit donc afficher les
  // libellés même quand la barre latérale de bureau est repliée. Les lire
  // depuis `replie` faisait fuiter l'état bureau dans le tiroir mobile, qui
  // n'affichait alors que des icônes sans texte.
  const navigation = (compact: boolean) => (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      {liens.map((lien) => (
        <LienNav key={lien.href} lien={lien} actif={estActif(lien.href)} compact={compact} />
      ))}
    </nav>
  );

  const pied = (compact: boolean) => (
    <div className="border-t border-white/10 p-3">
      {/* Le bloc identité mène au profil — c'est là que se change son mot de
          passe. Placé ici plutôt que dans la navigation pour rester accessible
          à tous les rôles, y compris TECHNICIEN et SUPPORT, dont le menu ne
          comporte que deux entrées métier. */}
      <Link
        href="/admin/profil"
        title="Mon profil"
        className={`flex items-center gap-3 rounded-lg p-1 transition hover:bg-white/10 ${
          compact ? "justify-center" : ""
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-jedco text-xs font-bold text-white">
          {initiales}
        </span>
        {!compact && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.prenom} {user.nom}
            </p>
            <p className="text-xs text-slate-400">{user.role}</p>
          </div>
        )}
      </Link>
      <div className={`mt-3 ${compact ? "flex justify-center" : ""}`}>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <SessionKeepAlive />
      {/* ─── Barre latérale, écrans larges ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-jedco-dark transition-[width] duration-200 lg:flex ${
          replie ? "w-[72px]" : "w-64"
        }`}
      >
        <div className={`flex items-center gap-2 px-4 py-5 ${replie ? "justify-center px-2" : ""}`}>
          {!replie && <span className="text-sm font-bold tracking-tight text-white">JEDCO</span>}
          <button
            onClick={basculerRepli}
            aria-label={replie ? "Déplier le menu" : "Replier le menu"}
            className={`rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white ${replie ? "" : "ml-auto"}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
              <path d={replie ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
            </svg>
          </button>
        </div>
        {navigation(replie)}
        {pied(replie)}
      </aside>

      {/* ─── Tiroir mobile ─── */}
      {mobileOuvert && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOuvert(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-jedco-dark">
            <div className="flex items-center justify-between px-4 py-5">
              <span className="text-sm font-bold tracking-tight text-white">JEDCO</span>
              <button
                onClick={() => setMobileOuvert(false)}
                aria-label="Fermer le menu"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {navigation(false)}
            {pied(false)}
          </aside>
        </div>
      )}

      {/* ─── Contenu ─── */}
      <div className={`transition-[padding] duration-200 ${replie ? "lg:pl-[72px]" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            onClick={() => setMobileOuvert(true)}
            aria-label="Ouvrir le menu"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-6 w-6">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-jedco-dark">
            {liens.find((l) => estActif(l.href))?.label ?? TITRES_HORS_NAV[pathname] ?? "Backoffice"}
          </h1>
          {(user.role === "ADMIN" || user.role === "SUPERVISEUR") && <NotificationsCloche />}
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
