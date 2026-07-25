import FadeUp from "./FadeUp";

const ZONES = ["Port-au-Prince", "Cap-Haïtien", "Les Cayes", "Jacmel", "Saint-Marc"];

export default function Coverage() {
  return (
    <section className="py-20 bg-slate-50 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <svg viewBox="0 0 800 300" className="h-[220px] w-[90%] max-w-4xl text-jedco" fill="currentColor" aria-hidden="true">
          <path d="M68 162c29-18 72-16 98-25 30-10 57-37 91-45 38-10 72 2 106-5 36-7 65-35 103-37 39-1 72 20 111 23 42 3 80-14 122-2 29 9 61 31 61 55 0 24-33 36-62 42-37 8-78 1-116 5-45 5-85 27-129 31-41 4-79-8-120-10-44-3-87 7-130 0-38-6-74-27-102-22-22 4-42 17-59 27-14 8-31 2-31-12 0-11 8-19 17-25z" />
        </svg>
      </div>
      <div className="max-w-6xl mx-auto px-6 text-center relative">
        <FadeUp>
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Zones de couverture</h2>
          <p className="mt-3 text-slate-500">Présence opérationnelle dans les principaux pôles urbains d&apos;Haïti.</p>
        </FadeUp>
        <FadeUp className="mt-10 flex flex-wrap justify-center gap-3">
          {ZONES.map((zone) => (
            <span key={zone} className="rounded-full border border-jedco text-jedco px-5 py-2 text-sm font-medium bg-white">
              {zone}
            </span>
          ))}
        </FadeUp>
      </div>
    </section>
  );
}
