import { redirect } from "next/navigation";
import Link from "next/link";
import { utilisateurCourant } from "@/lib/auth/current-user";
import AdminHeader from "./AdminHeader";

export default async function AdminHomePage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10">
        <p className="text-slate-700">
          Connecté en tant que{" "}
          <span className="font-semibold">
            {user.prenom} {user.nom}
          </span>{" "}
          ({user.role}).
        </p>
        <div className="mt-6 flex gap-4">
          <Link href="/admin/clients" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Clients</span>
            <span className="text-sm text-slate-500">Gérer les clients</span>
          </Link>
          <Link href="/admin/contrats" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Contrats</span>
            <span className="text-sm text-slate-500">Gérer les contrats</span>
          </Link>
          <Link href="/admin/interventions" className="rounded-lg bg-white border border-slate-200 px-5 py-4 hover:shadow-md transition">
            <span className="block font-semibold text-jedco-dark">Interventions</span>
            <span className="text-sm text-slate-500">Planifier et suivre</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
