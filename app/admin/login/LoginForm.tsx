"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Connexion impossible.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setErreur("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={motDePasseVisible ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30"
          />
          <button
            type="button"
            onClick={() => setMotDePasseVisible((v) => !v)}
            aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          >
            {motDePasseVisible ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.83 2.83M9.5 5.1A9.77 9.77 0 0 1 12 5c5 0 9 4 9 7-.3.6-.7 1.2-1.2 1.8M6.6 6.6C4.4 8 3 10 3 12c0 3 4 7 9 7 1.3 0 2.5-.3 3.6-.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  d="M3 12c0-3 4-7 9-7s9 4 9 7-4 7-9 7-9-4-9-7Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button
        type="submit"
        disabled={envoi}
        className="w-full rounded-lg bg-jedco px-6 py-3 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
      >
        {envoi ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
