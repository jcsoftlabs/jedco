import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import { listerTemoignages } from "@/lib/services/temoignages";
import NouveauTemoignageForm from "./NouveauTemoignageForm";
import TemoignageRow from "./TemoignageRow";

export default async function TemoignagesPage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const temoignages = await listerTemoignages();

  return (
    <div className="max-w-3xl">
        <h2 className="text-xl font-bold text-jedco-dark mb-2">Témoignages</h2>
        <p className="text-sm text-slate-500 mb-6">
          Seuls les témoignages actifs s&apos;affichent sur le site public, triés par ordre puis date.
        </p>

        <NouveauTemoignageForm />

        <div className="mt-8 space-y-3">
          {temoignages.map((t) => (
            <TemoignageRow
              key={t.id}
              temoignage={{
                id: t.id,
                nom: t.nom,
                type: t.type,
                note: t.note,
                commentaire: t.commentaire,
                actif: t.actif,
                ordre: t.ordre,
              }}
            />
          ))}
          {temoignages.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
              Aucun témoignage pour l&apos;instant.
            </p>
          )}
        </div>
    </div>
  );
}
