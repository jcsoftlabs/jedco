import { listerTemoignagesPublies } from "@/lib/services/temoignages";
import FadeUp from "./FadeUp";

// Server component : lit directement les témoignages actifs gérés depuis
// /admin/temoignages (Phase 4, vitrine dynamique) — plus de contenu codé en
// dur. Se cache entièrement s'il n'y a encore aucun témoignage publié,
// plutôt que d'afficher une section vide.
export default async function Testimonials() {
  const temoignages = await listerTemoignagesPublies();
  if (temoignages.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Témoignages clients</h2>
        </FadeUp>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {temoignages.map((t) => (
            <FadeUp key={t.id} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <article>
                <p className="text-jedco text-lg">
                  {"★".repeat(t.note)}
                  {"☆".repeat(5 - t.note)}
                </p>
                <p className="mt-3 text-sm text-slate-600 italic">&quot;{t.commentaire}&quot;</p>
                <p className="mt-4 text-sm font-semibold text-jedco-dark">
                  {t.type}
                </p>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
