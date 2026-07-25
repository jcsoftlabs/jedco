import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  const user = await utilisateurCourant();
  if (user) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-jedco-dark text-center">JEDCO — Backoffice</h1>
        <p className="mt-2 text-sm text-slate-500 text-center">Connectez-vous pour continuer.</p>
        <LoginForm />
      </div>
    </div>
  );
}
