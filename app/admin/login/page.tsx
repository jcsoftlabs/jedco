import { redirect } from "next/navigation";
import Image from "next/image";
import { utilisateurCourant } from "@/lib/auth/current-user";
import LoginForm from "./LoginForm";

export default async function AdminLoginPage() {
  const user = await utilisateurCourant();
  if (user) redirect("/admin");

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <Image src="/jedco-logo.png" alt="JEDCO" width={64} height={64} className="mx-auto h-16 w-auto" />
        <h1 className="mt-3 text-xl font-semibold text-jedco-dark text-center">Backoffice</h1>
        <p className="mt-2 text-sm text-slate-500 text-center">Connectez-vous pour continuer.</p>
        <LoginForm />
      </div>
    </div>
  );
}
