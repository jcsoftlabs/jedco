"use client";

import { useState } from "react";
import FadeUp from "./FadeUp";

type OptionService = { code: string; libelle: string };

type Mode = "devis" | "rendez-vous";

// Une date minimale pour l'attribut `min` du champ datetime-local — laisse la
// même marge de 30 minutes que le serveur (voir creerRendezVousSchema) pour
// ne pas bloquer une saisie que le serveur accepterait malgré tout.
function dateMinRendezVous(): string {
  return new Date(Date.now() - 30 * 60_000).toISOString().slice(0, 16);
}

export default function ContactForm({ services }: { services: OptionService[] }) {
  const [mode, setMode] = useState<Mode>("devis");
  const [submitted, setSubmitted] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function changerMode(m: Mode) {
    setMode(m);
    setSubmitted(false);
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    // Capturés avant le premier await : passé ce point, le navigateur remet
    // e.currentTarget à null (valable seulement pendant le dispatch
    // synchrone de l'événement) — l'utiliser après un await plantait
    // silencieusement sur form.reset(), rattrapé par le catch ci-dessous et
    // affichant "Connexion impossible" alors que la demande était bien
    // enregistrée en base.
    const form = e.currentTarget;
    const fd = new FormData(form);

    const endpoint = mode === "devis" ? "/api/public/demandes-devis" : "/api/public/rendez-vous";
    const corps =
      mode === "devis"
        ? {
            nom: fd.get("name"),
            telephone: fd.get("phone"),
            email: fd.get("email") || undefined,
            service: fd.get("service"),
            ville: fd.get("zone"),
            message: fd.get("message") || undefined,
          }
        : {
            nom: fd.get("name"),
            telephone: fd.get("phone"),
            email: fd.get("email") || undefined,
            service: fd.get("service"),
            ville: fd.get("zone"),
            adresse: fd.get("adresse") || undefined,
            dateVoulue: fd.get("dateVoulue"),
            message: fd.get("message") || undefined,
          };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(
          data.error ?? "Une erreur est survenue. Vous pouvez aussi nous appeler au 2942-1109 / 2942-1110."
        );
        return;
      }
      setSubmitted(true);
      form.reset();
    } catch {
      setErreur("Connexion impossible. Vous pouvez aussi nous appeler au 2942-1109 / 2942-1110.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section id="contact" className="py-20 bg-slate-50">
      <div className="max-w-2xl mx-auto px-6">
        <FadeUp className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-jedco-dark">Demande de contact</h2>
        </FadeUp>
        <FadeUp>
          <div className="mt-6 flex justify-center gap-2 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => changerMode("devis")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === "devis" ? "bg-white text-jedco shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Demande de devis
            </button>
            <button
              type="button"
              onClick={() => changerMode("rendez-vous")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === "rendez-vous" ? "bg-white text-jedco shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Prendre rendez-vous
            </button>
          </div>
          <form key={mode} onSubmit={handleSubmit} className="mt-8 space-y-5">
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                E-mail <span className="font-normal text-slate-400">(optionnel)</span>
              </label>
              <input id="email" name="email" type="email" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                <select id="service" name="service" required className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30">
                  <option value="">Sélectionnez un service</option>
                  {services.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="zone" className="block text-sm font-medium text-slate-700 mb-1">Zone</label>
                <input id="zone" name="zone" type="text" required placeholder="Ex : Cap-Haïtien" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
              </div>
            </div>
            {mode === "rendez-vous" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="dateVoulue" className="block text-sm font-medium text-slate-700 mb-1">
                    Date et heure souhaitées
                  </label>
                  <input
                    id="dateVoulue"
                    name="dateVoulue"
                    type="datetime-local"
                    required
                    min={dateMinRendezVous()}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30"
                  />
                </div>
                <div>
                  <label htmlFor="adresse" className="block text-sm font-medium text-slate-700 mb-1">
                    Adresse <span className="font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <input id="adresse" name="adresse" type="text" className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea id="message" name="message" rows={4} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30" />
            </div>
            <button
              type="submit"
              disabled={envoi}
              className="w-full rounded-lg bg-jedco px-6 py-3 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
            >
              {envoi ? "Envoi en cours…" : mode === "devis" ? "Envoyer la demande" : "Demander le rendez-vous"}
            </button>
            {submitted && (
              <p className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                {mode === "devis"
                  ? "Merci, votre demande a bien été envoyée. Notre équipe vous contactera rapidement."
                  : "Merci, votre demande de rendez-vous a bien été envoyée. Notre équipe la confirmera rapidement."}
              </p>
            )}
            {erreur && (
              <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{erreur}</p>
            )}
          </form>
        </FadeUp>
      </div>
    </section>
  );
}
