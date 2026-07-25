"use client";

import { useEffect, useRef, useState } from "react";

const STATS = [
  { target: 30, suffix: "+", label: "Années d'expérience" },
  { target: 5, suffix: "", label: "Villes couvertes" },
  { target: 1000, suffix: "+", label: "Clients satisfaits" },
  { target: 100, suffix: "%", label: "Interventions mécanisées" },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min((now - start) / 1400, 1);
            setValue(Math.floor(target * (1 - Math.pow(1 - t, 3))));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {value.toLocaleString("fr-FR")}
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section id="chiffres" className="py-20 bg-jedco-dark text-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-center">
          {STATS.map((s) => (
            <div key={s.label} className="fade-up">
              <p className="text-4xl font-bold">
                <Counter target={s.target} suffix={s.suffix} />
              </p>
              <p className="mt-2 text-sm text-blue-200">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
