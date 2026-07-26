"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Etape = "email" | "code";

export default function ConnexionForm() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function demanderCode(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/espace-client/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setMessage(data.message);
      setEtape("code");
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  async function verifierCode(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/espace-client/verifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Code invalide");
        return;
      }
      router.push("/espace-client");
      router.refresh();
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  if (etape === "code") {
    return (
      <form onSubmit={verifierCode} className="space-y-4">
        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}
        <div>
          <label htmlFor="code" className="mb-1 block text-sm font-medium text-slate-700">
            Code reçu par e-mail
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-2xl tracking-[0.5em] outline-none focus:border-jedco"
          />
        </div>
        {erreur && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}
        <button
          type="submit"
          disabled={envoi || code.length !== 6}
          className="w-full rounded-lg bg-jedco px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
        >
          {envoi ? "Vérification…" : "Se connecter"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEtape("email");
            setCode("");
            setErreur(null);
            setMessage(null);
          }}
          className="w-full text-center text-sm text-slate-500 hover:text-jedco"
        >
          Utiliser un autre e-mail
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={demanderCode} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-jedco"
        />
        <p className="mt-1 text-xs text-slate-400">
          Doit correspondre à l&apos;e-mail enregistré sur votre dossier client JEDCO.
        </p>
      </div>
      {erreur && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
      )}
      <button
        type="submit"
        disabled={envoi || !email.trim()}
        className="w-full rounded-lg bg-jedco px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60"
      >
        {envoi ? "Envoi…" : "Recevoir un code de connexion"}
      </button>
    </form>
  );
}
