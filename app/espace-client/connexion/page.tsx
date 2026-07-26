import { redirect } from "next/navigation";
import { clientCourant } from "@/lib/auth/current-client";
import ConnexionForm from "./ConnexionForm";

export default async function ConnexionClientPage() {
  const client = await clientCourant();
  if (client) redirect("/espace-client");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <a href="/" className="text-lg font-bold text-jedco">JEDCO Services S.A.</a>
        <h1 className="mt-2 text-xl font-semibold text-slate-800">Espace client</h1>
        <p className="mt-1 text-sm text-slate-500">
          Consultez vos devis et factures. Connexion sans mot de passe : un code vous est envoyé par e-mail.
        </p>
      </div>
      <ConnexionForm />
    </div>
  );
}
