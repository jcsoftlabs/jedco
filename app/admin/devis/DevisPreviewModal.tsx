"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";

export default function DevisPreviewModal({
  devisId,
  reference,
  onFermer,
}: {
  devisId: string;
  reference: string;
  onFermer: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const urlPdf = `/api/devis/${devisId}/pdf`;

  function imprimer() {
    iframeRef.current?.contentWindow?.print();
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
            <button
              onClick={imprimer}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Imprimer
            </button>
            <a
              href={urlPdf}
              download={`${reference}.pdf`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
            >
              Télécharger
            </a>
            <button
              onClick={onFermer}
              aria-label="Fermer"
              className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
        <iframe ref={iframeRef} src={urlPdf} title={`Devis ${reference}`} className="flex-1 rounded-b-lg" />
      </div>
    </div>,
    document.body
  );
}
