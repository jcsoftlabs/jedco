"use client";

import { useState } from "react";
import FadeUp from "./FadeUp";

const SERVICES = [
  "Vidange de fosses septiques",
  "Collecte d'ordures",
  "Toilettes mobiles",
  "Pest Control",
  "Nettoyage industriel",
  "Contrats municipaux",
];

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    e.currentTarget.reset();
  }

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="max-w-2xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Demande de contact</h2>
        </FadeUp>
        <FadeUp>
          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                <input id="name" name="name" type="text" required className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                <input id="phone" name="phone" type="tel" required className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select id="service" name="service" required className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30">
                  <option value="">Sélectionnez un service</option>
                  {SERVICES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="zone" className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                <input id="zone" name="zone" type="text" required placeholder="Ex : Cap-Haïtien" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea id="message" name="message" rows={4} required className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
            </div>
            <button type="submit" className="w-full rounded-lg bg-jedco px-6 py-3 text-sm font-semibold text-white hover:bg-jedco-light transition">
              Envoyer la demande
            </button>
            {submitted && (
              <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                Merci, votre demande a bien été envoyée. Notre équipe vous contactera rapidement.
              </p>
            )}
          </form>
        </FadeUp>
      </div>
    </section>
  );
}
