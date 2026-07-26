"use client";

import { useEffect, useRef, useState } from "react";

const INTERVALLE_POLL_MS = 4_000;

type Message = { id: string; role: "VISITEUR" | "IA" | "AGENT"; contenu: string; createdAt: string };
type Conversation = {
  id: string;
  statut: "IA" | "EN_ATTENTE_AGENT" | "PRISE_EN_CHARGE" | "FERMEE";
  agentId: string | null;
  nom: string | null;
  telephone: string | null;
  updatedAt: string;
  messages: Message[];
};

// Bip généré par synthèse (oscillateur Web Audio) plutôt qu'un fichier audio
// externe — pas de fichier statique à héberger, et fonctionne partout sans
// dépendance réseau.
function jouerBip() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Certains navigateurs bloquent AudioContext avant toute interaction —
    // tant pis pour le son, la liste visuelle reste à jour de toute façon.
  }
}

function libelleRole(role: Message["role"]): string {
  if (role === "VISITEUR") return "Visiteur";
  if (role === "IA") return "Tiffany";
  return "Vous";
}

export default function SupportDashboard() {
  const [enAttente, setEnAttente] = useState<Conversation[]>([]);
  const [mesConversations, setMesConversations] = useState<Conversation[]>([]);
  const [conversationOuverteId, setConversationOuverteId] = useState<string | null>(null);
  const [reponse, setReponse] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const nombreEnAttenteRef = useRef(0);
  const messagesRef = useRef<HTMLDivElement>(null);

  async function rafraichir() {
    try {
      const res = await fetch("/api/support/conversations");
      const data = await res.json();
      if (!data.success) return;

      if (data.data.enAttente.length > nombreEnAttenteRef.current) {
        jouerBip();
      }
      nombreEnAttenteRef.current = data.data.enAttente.length;
      setEnAttente(data.data.enAttente);
      setMesConversations(data.data.mesConversations);
    } catch {
      // Une vérification manquée n'est pas grave, la suivante rattrapera.
    }
  }

  useEffect(() => {
    rafraichir();
    const id = setInterval(rafraichir, INTERVALLE_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [conversationOuverteId, enAttente, mesConversations]);

  const conversationOuverte =
    [...enAttente, ...mesConversations].find((c) => c.id === conversationOuverteId) ?? null;

  async function prendreEnCharge(id: string) {
    setErreur(null);
    try {
      const res = await fetch(`/api/support/conversations/${id}/prendre`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      await rafraichir();
    } catch {
      setErreur("Connexion impossible.");
    }
  }

  async function envoyerReponse(e: React.FormEvent) {
    e.preventDefault();
    if (!conversationOuverteId || !reponse.trim()) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/support/conversations/${conversationOuverteId}/repondre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: reponse.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setReponse("");
      await rafraichir();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  async function fermer(id: string) {
    if (!confirm("Fermer cette conversation ?")) return;
    setErreur(null);
    try {
      const res = await fetch(`/api/support/conversations/${id}/fermer`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setConversationOuverteId(null);
      await rafraichir();
    } catch {
      setErreur("Connexion impossible.");
    }
  }

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4 overflow-y-auto">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            En attente
            {enAttente.length > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">{enAttente.length}</span>
            )}
          </h3>
          {enAttente.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
              Aucune conversation en attente.
            </p>
          ) : (
            <div className="space-y-2">
              {enAttente.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConversationOuverteId(c.id)}
                  className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                    c.id === conversationOuverteId
                      ? "border-jedco bg-jedco/5"
                      : "border-amber-300 bg-amber-50 hover:bg-amber-100"
                  }`}
                >
                  <p className="font-medium text-jedco-dark">{c.nom || "Visiteur anonyme"}</p>
                  <p className="truncate text-xs text-slate-500">
                    {c.messages.filter((m) => m.role === "VISITEUR").at(-1)?.contenu.slice(0, 60)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.telephone && `${c.telephone} · `}
                    {new Date(c.updatedAt).toLocaleTimeString("fr-FR")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mes conversations</h3>
          {mesConversations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
              Aucune conversation prise en charge.
            </p>
          ) : (
            <div className="space-y-2">
              {mesConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setConversationOuverteId(c.id)}
                  className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                    c.id === conversationOuverteId ? "border-jedco bg-jedco/5" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-medium text-jedco-dark">{c.nom || "Visiteur anonyme"}</p>
                  <p className="truncate text-xs text-slate-500">{c.messages.at(-1)?.contenu.slice(0, 60)}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.telephone && `${c.telephone} · `}
                    {new Date(c.updatedAt).toLocaleTimeString("fr-FR")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        {!conversationOuverte ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Sélectionnez une conversation à gauche.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    conversationOuverte.statut === "EN_ATTENTE_AGENT"
                      ? "bg-amber-100 text-amber-700"
                      : conversationOuverte.statut === "FERMEE"
                        ? "bg-slate-200 text-slate-500"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {conversationOuverte.statut.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-medium text-jedco-dark">{conversationOuverte.nom || "Visiteur anonyme"}</span>
                {conversationOuverte.telephone && (
                  <a href={`tel:${conversationOuverte.telephone}`} className="text-xs text-jedco hover:underline">
                    {conversationOuverte.telephone}
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                {conversationOuverte.statut === "EN_ATTENTE_AGENT" && (
                  <button
                    onClick={() => prendreEnCharge(conversationOuverte.id)}
                    className="rounded-lg border border-jedco px-3 py-1.5 text-xs font-medium text-jedco hover:bg-jedco/5"
                  >
                    Prendre en charge
                  </button>
                )}
                {conversationOuverte.statut !== "FERMEE" && (
                  <button
                    onClick={() => fermer(conversationOuverte.id)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
                  >
                    Fermer
                  </button>
                )}
              </div>
            </div>

            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
              {conversationOuverte.messages.map((m) => (
                <div key={m.id} className={m.role === "VISITEUR" ? "flex justify-start" : "flex justify-end"}>
                  <div className="max-w-[75%]">
                    <p
                      className={`mb-0.5 px-1 text-[11px] font-medium ${
                        m.role === "VISITEUR" ? "text-slate-400" : "text-jedco"
                      }`}
                    >
                      {libelleRole(m.role)}
                    </p>
                    <div
                      className={`rounded-lg px-4 py-2.5 text-sm ${
                        m.role === "VISITEUR"
                          ? "rounded-bl-sm border border-slate-200 bg-white text-slate-700"
                          : "rounded-br-sm bg-jedco-dark text-white"
                      }`}
                    >
                      {m.contenu}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {erreur && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{erreur}</p>}

            {conversationOuverte.statut !== "FERMEE" ? (
              <form onSubmit={envoyerReponse} className="flex gap-2 border-t border-slate-200 p-3">
                <input
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Votre réponse…"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
                />
                <button
                  type="submit"
                  disabled={envoi || !reponse.trim()}
                  className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
                >
                  {envoi ? "Envoi…" : "Envoyer"}
                </button>
              </form>
            ) : (
              <p className="border-t border-slate-200 p-3 text-center text-xs text-slate-400">
                Conversation fermée — un nouveau message du visiteur la rouvrira automatiquement.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
