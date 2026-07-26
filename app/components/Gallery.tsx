import { listerMediaGaleriePublie } from "@/lib/services/galerie";
import FadeUp from "./FadeUp";

// Server component : ne rend rien si aucune photo n'est publiée, plutôt
// qu'une section vide ou un espace réservé vide sur le site public.
export default async function Gallery() {
  const photos = await listerMediaGaleriePublie();
  if (photos.length === 0) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Nos interventions en images</h2>
        </FadeUp>
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <FadeUp key={photo.id} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.legende ?? "Intervention JEDCO"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
