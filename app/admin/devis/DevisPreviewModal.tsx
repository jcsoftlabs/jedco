"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconeEnveloppe, IconeImprimante, IconeTelecharger, IconeFermer } from "../icons";
import Tooltip from "../Tooltip";

export default function DevisPreviewModal({
  devisId,
  reference,
  clientEmail,
  onFermer,
}: {
  devisId: string;
  reference: string;
  clientEmail: string | null;
  onFermer: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlPdf = `/api/devis/${devisId}/pdf`;
  const [envoi, setEnvoi] = useState(false);
  const [messageEnvoi, setMessageEnvoi] = useState<{ texte: string; erreur: boolean } | null>(null);

  function imprimer() {
    iframeRef.current?.contentWindow?.print();
  }

  async function envoyerParEmail() {
    setEnvoi(true);
    setMessageEnvoi(null);
    try {
      const res = await fetch(`/api/devis/${devisId}/envoyer-email`, { method: "POST" });
      const data = await res.json();
      setMessageEnvoi({ texte: data.message ?? data.error ?? "Erreur", erreur: !data.success });
    } catch {
      setMessageEnvoi({ texte: "Connexion impossible.", erreur: true });
    } finally {
      setEnvoi(false);
    }
  }

  // Portail vers document.body : ce composant est rendu depuis DevisRow, lui-
  // même appelé dans un <tbody> — voir FacturePreviewModal pour le même choix.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onFermer}
    >
      <div
        className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="font-semibold text-jedco-dark">Devis {reference}</h3>
          <div className="flex items-center gap-2">
            {clientEmail && (
              <Tooltip texte={envoi ? "Envoi…" : `Envoyer à ${clientEmail}`}>
                <button
                  onClick={envoyerParEmail}
                  disabled={envoi}
                  aria-label="Envoyer par e-mail"
                  className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                >
                  <IconeEnveloppe />
                </button>
              </Tooltip>
            )}
            <Tooltip texte="Imprimer">
              <button
                onClick={imprimer}
                aria-label="Imprimer"
                className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
              >
                <IconeImprimante />
              </button>
            </Tooltip>
            <Tooltip texte="Télécharger">
              <a
                href={urlPdf}
                download={`${reference}.pdf`}
                aria-label="Télécharger"
                className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
              >
                <IconeTelecharger />
              </a>
            </Tooltip>
            <Tooltip texte="Fermer">
              <button
                onClick={onFermer}
                aria-label="Fermer"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <IconeFermer />
              </button>
            </Tooltip>
          </div>
        </div>
        {messageEnvoi && (
          <p
            className={`px-5 pt-2 text-sm ${messageEnvoi.erreur ? "text-red-600" : "text-emerald-600"}`}
          >
            {messageEnvoi.texte}
          </p>
        )}
        <iframe ref={iframeRef} src={urlPdf} title={`Devis ${reference}`} className="flex-1 rounded-b-lg" />
      </div>
    </div>,
    document.body
  );
}
