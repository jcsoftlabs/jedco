"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "./ChatContext";

type Message = { role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const { isOpen, showConversation, openChat, closeChat, goToConversation, goToWelcome } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showConversation && !initialized) {
      setMessages([
        {
          role: "assistant",
          text: "Bonjour, je suis l'assistant JEDCO. Décrivez votre situation (zone, urgence, type de problème) et je vous oriente vers le bon service.",
        },
      ]);
      setInitialized(true);
    }
    if (showConversation) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [showConversation, initialized]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: "Erreur : " + (data?.error || "Problème de connexion.") }]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply || "Je n'ai pas pu générer une recommandation. Veuillez reformuler." },
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Connexion impossible. Vérifiez votre réseau et réessayez." }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Ouvrir l'assistant JEDCO"
        onClick={() => (isOpen ? closeChat() : openChat(false))}
        className="fixed bottom-6 right-6 z-[70] h-14 w-14 rounded-full bg-jedco text-white shadow-xl shadow-jedco/30 transition hover:bg-jedco-light focus:outline-none focus:ring-4 focus:ring-jedco/20"
      >
        <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-6 w-6" stroke="currentColor" strokeWidth={2}>
          <path d="M8 10h8M8 14h5" strokeLinecap="round" />
          <path
            d="M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-3.67-.68L3 21l1.87-4.05A7.64 7.64 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={`chat-widget-panel fixed bottom-24 right-4 z-[80] w-[calc(100vw-2rem)] max-w-[420px] ${isOpen ? "open" : ""}`}>
        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl">
          {!showConversation ? (
            <div className="bg-jedco-dark px-6 pt-6 pb-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[36px] sm:text-[44px] leading-none font-semibold">Bonjour 👋</h3>
                <button onClick={closeChat} type="button" className="rounded-md border border-white/30 px-2 py-1 text-xs text-white/90 hover:bg-white/10">
                  Fermer
                </button>
              </div>
              <p className="mt-5 max-w-[330px] text-base sm:text-[20px] leading-snug text-blue-100">
                En discutant avec nous, vous acceptez que la conversation puisse être suivie, enregistrée et utilisée à des fins d&apos;amélioration.
              </p>
              <button
                onClick={goToConversation}
                type="button"
                className="mt-8 w-full rounded-2xl bg-white px-5 py-5 text-left text-slate-900 transition hover:bg-slate-100"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="block text-lg sm:text-[20px] font-semibold">Nouvelle conversation</span>
                    <span className="mt-1 block text-sm sm:text-base text-slate-500">Nous répondons généralement en quelques minutes</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-jedco" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 20 20 12 4 4l4 8-4 8Z" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between bg-jedco-dark px-5 py-3 text-white">
                <p className="text-sm font-medium">Assistant JEDCO</p>
                <button onClick={closeChat} type="button" className="rounded-md border border-white/30 px-2 py-1 text-xs text-white/90 hover:bg-white/10">
                  Fermer
                </button>
              </div>
              <div ref={messagesRef} className="h-72 overflow-y-auto space-y-3 bg-slate-50 p-5">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] rounded-lg rounded-br-sm bg-jedco-dark text-white px-4 py-2.5 text-sm"
                          : "max-w-[80%] rounded-lg rounded-bl-sm bg-white border border-slate-200 text-slate-700 px-4 py-2.5 text-sm"
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="rounded-lg rounded-bl-sm bg-white border border-slate-200 px-4 py-2.5">
                      <span className="typing-dot" />
                      <span className="typing-dot ml-1" />
                      <span className="typing-dot ml-1" />
                    </div>
                  </div>
                )}
              </div>
              <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ex : Ma fosse déborde à Delmas, besoin urgent…"
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-jedco focus:ring-1 focus:ring-jedco/30"
                    required
                  />
                  <button type="submit" className="rounded-lg bg-jedco px-5 py-2.5 text-sm font-semibold text-white hover:bg-jedco-light transition">
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50">
            <button
              onClick={goToWelcome}
              type="button"
              aria-label="Accueil chat"
              className={`flex items-center justify-center py-3 transition ${!showConversation ? "text-jedco" : "text-slate-500 hover:text-jedco"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
                <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={goToConversation}
              type="button"
              aria-label="Conversation chat"
              className={`flex items-center justify-center py-3 transition ${showConversation ? "text-jedco" : "text-slate-500 hover:text-jedco"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={2}>
                <path d="M8 10h8M8 14h5" strokeLinecap="round" />
                <path
                  d="M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-3.67-.68L3 21l1.87-4.05A7.64 7.64 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
