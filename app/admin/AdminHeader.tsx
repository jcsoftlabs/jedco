import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function AdminHeader({
  user,
}: {
  user: { nom: string; prenom: string; role: string };
}) {
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
        <Link href="/admin/clients" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Clients
        </Link>
        <Link href="/admin/contrats" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Contrats
        </Link>
        <Link href="/admin/interventions" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Interventions
        </Link>
        <Link href="/admin/factures" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Facturation
        </Link>
        <Link href="/admin/devis" className="px-3 py-2 text-sm text-slate-600 hover:text-jedco">
          Devis
        </Link>
      </nav>
    </header>
  );
}
