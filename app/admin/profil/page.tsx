import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import MotDePasseForm from "./MotDePasseForm";

// Accessible à TOUS les rôles, sans requireRole : c'est la seule page du
// backoffice dont un technicien ou un agent de support a besoin sans être
// administrateur.
export default async function ProfilPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");

  const LIBELLES: Record<string, string> = {
    ADMIN: "Administrateur",
    SUPERVISEUR: "Superviseur",
    TECHNICIEN: "Technicien",
    SUPPORT: "Support client",
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Mon profil</h2>
        <p className="mt-1 text-sm text-slate-500">Vos informations de connexion.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Nom</dt>
            <dd className="mt-1 text-sm font-medium text-jedco-dark">
              {user.prenom} {user.nom}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">E-mail</dt>
            <dd className="mt-1 text-sm text-jedco-dark">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Rôle</dt>
            <dd className="mt-1 text-sm text-jedco-dark">{LIBELLES[user.role] ?? user.role}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">
          Nom, e-mail et rôle ne se modifient pas ici — demandez à un administrateur.
        </p>
      </section>

      <MotDePasseForm />

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-jedco-dark">Mot de passe oublié ?</h3>
        <p className="mt-1 text-xs text-slate-500">
          Il n&apos;y a pas de récupération par e-mail. Demandez à un administrateur de réinitialiser
          votre mot de passe depuis <strong>Utilisateurs</strong>, puis changez-le ici dès votre
          première connexion.
        </p>
      </section>
    </div>
  );
}
