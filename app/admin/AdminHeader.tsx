import Link from "next/link";
import LogoutButton from "./LogoutButton";

const LIENS_ADMIN_SUPERVISEUR = [
  { href: "/admin/demandes", label: "Demandes" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/contrats", label: "Contrats" },
  { href: "/admin/interventions", label: "Interventions" },
  { href: "/admin/terrain", label: "Terrain" },
  { href: "/admin/techniciens", label: "Techniciens" },
  { href: "/admin/factures", label: "Facturation" },
  { href: "/admin/devis", label: "Devis" },
  { href: "/admin/catalogue", label: "Catalogue" },
];

// Un TECHNICIEN n'a accès qu'aux deux seules pages qui ne posent pas de
// requireRole(["ADMIN", "SUPERVISEUR"]) — Interventions (vue dense scopée à
// ses propres interventions) et Terrain (vue mobile, voir Phase 3). Tous les
// autres liens le renverraient immédiatement sur /admin ; les lui montrer
// quand même serait un cul-de-sac plutôt qu'une vraie fonctionnalité.
const LIENS_TECHNICIEN = [
  { href: "/admin/terrain", label: "Terrain" },
  { href: "/admin/interventions", label: "Interventions" },
];

export default function AdminHeader({
  user,
}: {
  user: { nom: string; prenom: string; role: string };
}) {
  const liens = user.role === "TECHNICIEN" ? LIENS_TECHNICIEN : LIENS_ADMIN_SUPERVISEUR;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold text-jedco-dark">JEDCO — Backoffice</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            {user.prenom} {user.nom} ({user.role})
          </span>
          <LogoutButton />
        </div>
      </div>
      <nav className="flex gap-1 px-6 border-t border-slate-100">
        <Link href="/admin" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Accueil
        </Link>
        {liens.map((lien) => (
          <Link key={lien.href} href={lien.href} className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
            {lien.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
