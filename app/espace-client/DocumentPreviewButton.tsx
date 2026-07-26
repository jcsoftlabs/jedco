"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

// Équivalent simplifié de FacturePreviewModal (backoffice) pour le portail
// client : aperçu + impression + téléchargement, sans le bouton "Envoyer par
// e-mail" qui n'a pas de sens côté client.
export default function DocumentPreviewButton({ url, titre }: { url: string; titre: string }) {
  const [ouvert, setOuvert] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function imprimer() {
    iframeRef.current?.contentWindow?.print();
  }

  return (
    <>
      <button onClick={() => setOuvert(true)} className="text-jedco hover:underline">
        Aperçu
      </button>
      {ouvert &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setOuvert(false)}
          >
            <div
              className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h3 className="font-semibold text-jedco-dark">{titre}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={imprimer}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Imprimer
                  </button>
                  <a
                    href={url}
                    download={`${titre}.pdf`}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Télécharger
                  </a>
                  <button
                    onClick={() => setOuvert(false)}
                    aria-label="Fermer"
                    className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <iframe ref={iframeRef} src={url} title={titre} className="flex-1 rounded-b-lg" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
