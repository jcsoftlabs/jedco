import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerUtilisateurs } from "@/lib/services/utilisateurs";
import UtilisateursTable from "./UtilisateursTable";

export default async function UtilisateursPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    // ADMIN seul : cette page permet de reprendre la main sur n'importe quel
    // compte, y compris un autre administrateur.
    requireRole(user, ["ADMIN"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const utilisateurs = await listerUtilisateurs();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-jedco-dark">Utilisateurs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tous les comptes qui peuvent se connecter au backoffice. Les techniciens se créent depuis
          <strong> Techniciens</strong>, les agents de support depuis <strong>Support</strong> —
          cette page sert à réinitialiser un mot de passe oublié et à fermer l&apos;accès d&apos;une
          personne qui quitte l&apos;entreprise.
        </p>
      </div>

      <UtilisateursTable utilisateurs={utilisateurs} idCourant={user.id} />
    </div>
  );
}
