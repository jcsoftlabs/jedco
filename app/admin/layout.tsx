import { utilisateurCourant } from "@/lib/auth/current-user";
import AdminShell from "./AdminShell";

// Enveloppe commune à tout /admin — la barre latérale et l'en-tête vivent ici
// plutôt que d'être répétés dans chaque page.
//
// /admin/login est aussi sous ce layout mais n'a pas d'utilisateur connecté :
// on rend alors les enfants nus, sans coquille. Chaque page garde par ailleurs
// sa propre redirection vers /admin/login — ce layout ne fait qu'afficher, il
// ne remplace pas le contrôle d'accès.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await utilisateurCourant();
  if (!user) return <>{children}</>;

  return (
    <AdminShell user={{ nom: user.nom, prenom: user.prenom, role: user.role }}>{children}</AdminShell>
  );
}
