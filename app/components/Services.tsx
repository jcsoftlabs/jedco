import FadeUp from "./FadeUp";

const SERVICES = [
  { icon: "🚛", title: "Vidange de fosses septiques", desc: "Pompage sécurisé et transport conforme pour vos installations résidentielles et commerciales." },
  { icon: "🗑️", title: "Collecte d'ordures", desc: "Collecte planifiée et ponctuelle pour maintenir des espaces propres et salubres." },
  { icon: "🚽", title: "Toilettes mobiles", desc: "Solutions sanitaires mobiles pour chantiers, événements et situations d'urgence." },
  { icon: "🐀", title: "Pest Control", desc: "Traitements ciblés contre les nuisibles, conformes aux protocoles de santé publique." },
  { icon: "🧹", title: "Nettoyage industriel", desc: "Nettoyage technique d'installations industrielles et zones à forte exigence sanitaire." },
  { icon: "📋", title: "Contrats municipaux", desc: "Partenariats durables avec les mairies pour des programmes d'assainissement à grande échelle." },
];

export default function Services() {
  return (
    <section id="services" className="py-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Nos services</h2>
          <p className="mt-3 text-slate-500 max-w-lg mx-auto">
            Des solutions complètes d&apos;assainissement pour les particuliers, entreprises et collectivités.
          </p>
        </FadeUp>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <FadeUp key={s.title} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition">
              <div className="w-10 h-10 rounded-lg bg-jedco/10 flex items-center justify-center text-jedco font-bold text-lg">
                {s.icon}
              </div>
              <h3 className="mt-4 font-semibold text-jedco-dark">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
