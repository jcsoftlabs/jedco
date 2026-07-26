import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerTechniciens } from "@/lib/services/techniciens";
import NouveauTechnicienForm from "./NouveauTechnicienForm";
import TechnicienRow from "./TechnicienRow";

export default async function TechniciensPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const techniciens = await listerTechniciens();

  return (
    <div className="max-w-3xl">
        <h2 className="text-xl font-bold text-jedco-dark mb-2">Techniciens</h2>
        <p className="text-sm text-slate-500 mb-6">
          Créer un compte technicien crée à la fois ses identifiants de connexion et sa fiche
          d&apos;affectation. Le compte peut ensuite se connecter sur /admin/login et accéder à{" "}
          <span className="font-mono text-xs">/admin/terrain</span>.
        </p>

        {user.role === "ADMIN" && <NouveauTechnicienForm />}

        <table className="mt-8 w-full text-sm bg-white rounded-lg border border-slate-200 overflow-hidden">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 bg-slate-50">
              <th className="py-2 px-4">Matricule</th>
              <th className="px-4">Nom</th>
              <th className="px-4">E-mail</th>
              <th className="px-4">Spécialités</th>
              <th className="px-4">Zones</th>
              <th className="px-4">Statut</th>
              <th className="px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {techniciens.map((t) => (
              <TechnicienRow
                key={t.id}
                technicien={{
                  id: t.id,
                  matricule: t.matricule,
                  nom: t.user.nom,
                  prenom: t.user.prenom,
                  email: t.user.email,
                  specialites: t.specialites,
                  zonesAssignees: t.zonesAssignees,
                  disponible: t.disponible,
                }}
              />
            ))}
            {techniciens.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-4 text-center text-slate-400">
                  Aucun technicien pour l&apos;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
    </div>
  );
}
