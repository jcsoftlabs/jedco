"use client";

import { useEffect, useState } from "react";
import { useChat } from "./ChatContext";

const SLIDES = [
  "https://images.unsplash.com/photo-1761479578277-b11d0092699d?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1762235634143-6d350fe349e8?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1770624251477-5f81471a6817?auto=format&fit=crop&w=2200&q=80",
  "https://images.unsplash.com/photo-1759240808758-97556b89e6e2?auto=format&fit=crop&w=2200&q=80",
];

export default function Hero() {
  const [index, setIndex] = useState(0);
  const { openChat } = useChat();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative text-white overflow-hidden">
      <div className="absolute inset-0">
        {SLIDES.map((url, i) => (
          <div
            key={url}
            className={`hero-slide ${i === index ? "active" : ""}`}
            style={{ backgroundImage: `url('${url}')` }}
          />
        ))}
        <div className="absolute inset-0 bg-jedco-dark/75" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 py-20 lg:py-28">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-200 mb-4">Depuis 1994</p>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-2xl">
          L&apos;Assainissement Professionnel en Haïti
        </h1>
        <p className="mt-6 text-lg text-blue-100 max-w-xl leading-relaxed">
          Depuis 1994, JEDCO protège la santé publique à travers toute l&apos;île.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="#contact" className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-jedco-dark hover:bg-blue-50 transition">
            Demander un Devis
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              openChat(true);
            }}
            className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition"
          >
            Parler à notre assistant
          </a>
        </div>

        <div className="mt-10 flex items-center gap-2">
          {SLIDES.map((url, i) => (
            <button
              key={url}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={i === index ? "h-2.5 w-8 rounded-full bg-white/90" : "h-2.5 w-2.5 rounded-full bg-white/50"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
