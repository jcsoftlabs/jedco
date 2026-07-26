import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerCatalogue } from "@/lib/services/catalogue";
import NouvelArticleForm from "./NouvelArticleForm";
import ArticleRow from "./ArticleRow";

export default async function CataloguePage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const articles = await listerCatalogue();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-2">Catalogue services & produits</h2>
        <p className="text-sm text-slate-500 mb-6">
          Sert à accélérer la saisie des lignes de facture et de devis — les prix restent indicatifs
          et modifiables ligne par ligne.
        </p>

        <NouvelArticleForm />

        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Nom</th>
              <th className="px-4">Type</th>
              <th className="px-4">Prix suggéré</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <ArticleRow
                key={a.id}
                article={{
                  id: a.id,
                  nom: a.nom,
                  type: a.type,
                  prixSuggereHTG: a.prixSuggereHTG?.toString() ?? null,
                  actif: a.actif,
                }}
              />
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 px-4 text-center text-slate-400">
                  Aucun article pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </main>
    </div>
  );
}
