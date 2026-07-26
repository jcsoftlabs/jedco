"use client";

import { useEffect, useState } from "react";

type Agent = { id: string; email: string; nom: string; prenom: string; actif: boolean };

export default function GestionAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    const res = await fetch("/api/support/agents");
    const data = await res.json();
    if (data.success) setAgents(data.data);
  }

  useEffect(() => {
    charger();
  }, []);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/support/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, motDePasse, nom, prenom }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setEmail("");
      setMotDePasse("");
      setNom("");
      setPrenom("");
      setOuvert(false);
      await charger();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerActif(id: string) {
    await fetch(`/api/support/agents/${id}`, { method: "PUT" });
    await charger();
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-jedco-dark">Agents support ({agents.length})</h3>

      <div className="mt-3 space-y-2">
        {agents.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <div>
              <span className="font-medium text-jedco-dark">
                {a.prenom} {a.nom}
              </span>
              <span className="ml-2 text-slate-500">{a.email}</span>
            </div>
            <button
              onClick={() => basculerActif(a.id)}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                a.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
              }`}
            >
              {a.actif ? "Actif" : "Désactivé"}
            </button>
          </div>
        ))}
      </div>

      {!ouvert ? (
        <button onClick={() => setOuvert(true)} className="mt-3 text-sm text-jedco hover:underline">
          + Ajouter un agent
        </button>
      ) : (
        <form onSubmit={creer} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              required
              placeholder="Prénom"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
            />
            <input
              required
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
            />
          </div>
          <input
            required
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
          <input
            required
            type="password"
            placeholder="Mot de passe (8 caractères min.)"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
          {erreur && <p className="text-xs text-red-600">{erreur}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={envoi}
              className="rounded-lg bg-jedco px-3 py-1.5 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
            >
              {envoi ? "Création…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
