import FadeUp from "./FadeUp";

const TESTIMONIALS = [
  {
    stars: "★★★★★",
    quote: "Service rapide et professionnel pour nos installations industrielles. Équipe toujours ponctuelle.",
    author: "Entreprise — AgroTrans Haiti",
  },
  {
    stars: "★★★★★",
    quote: "JEDCO accompagne nos actions terrain avec des solutions sanitaires fiables et adaptées.",
    author: "ONG — Solidarité Santé",
  },
  {
    stars: "★★★★☆",
    quote: "Intervention efficace pour ma fosse septique. Prise en charge claire et respectueuse.",
    author: "Particulier — Pétion-Ville",
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Témoignages clients</h2>
        </FadeUp>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <FadeUp key={t.author} className="rounded-xl border border-slate-200 bg-slate-50 p-6">
              <article>
                <p className="text-jedco text-lg">{t.stars}</p>
                <p className="mt-3 text-sm text-slate-600 italic">&quot;{t.quote}&quot;</p>
                <p className="mt-4 text-sm font-semibold text-jedco-dark">{t.author}</p>
              </article>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
