import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole, ErreurAcces } from "@/lib/auth/rbac";
import AdminHeader from "../AdminHeader";
import { listerMediaGalerieAdmin } from "@/lib/services/galerie";
import NouvellePhotoForm from "./NouvellePhotoForm";
import PhotoCard from "./PhotoCard";

export default async function GaleriePage() {
  const user = await utilisateurCourant();
  if (!user) redirect("/admin/login");
  try {
    requireRole(user, ["ADMIN", "SUPERVISEUR"]);
  } catch (e) {
    if (e instanceof ErreurAcces) redirect("/admin");
    throw e;
  }

  const media = await listerMediaGalerieAdmin();

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminHeader user={user} />
      <main className="px-6 py-10 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-jedco-dark mb-2">Galerie publique</h2>
        <p className="text-sm text-slate-500 mb-6">
          Seules les photos publiées apparaissent sur le site public — les photos de rapport
          d&apos;intervention (issues du terrain) ne sont jamais publiées automatiquement.
        </p>

        <NouvellePhotoForm />

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {media.map((m) => (
            <PhotoCard
              key={m.id}
              media={{
                id: m.id,
                url: m.url,
                legende: m.legende,
                publieGalerie: m.publieGalerie,
              }}
            />
          ))}
          {media.length === 0 && (
            <p className="col-span-full rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
              Aucune photo pour l&apos;instant.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
