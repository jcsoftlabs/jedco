import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import LogoutButton from "./LogoutButton";

export default async function AdminHomePage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-bold text-jedco-dark">JEDCO — Backoffice</h1>
        <LogoutButton />
      </header>
      <main className="px-6 py-10">
        <p className="text-slate-700">
          Connecté en tant que <span className="font-semibold">{user.prenom} {user.nom}</span>{" "}
          ({user.role}).
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Le reste du backoffice (dashboard, clients, interventions…) arrive dans les phases
          suivantes du plan.
        </p>
      </main>
    </div>
  );
}
