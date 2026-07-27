"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import SignaturePad, { type SignaturePadHandle } from "./SignaturePad";

const TYPES_MIME_ACCEPTES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

function typeMime(fichier: File): string | null {
  if (fichier.type) return fichier.type;
  const ext = fichier.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_MIME_ACCEPTES[ext] ?? null;
}

export default function RapportForm({
  interventionId,
  marquerTermineApres,
  onFermer,
}: {
  interventionId: string;
  // Certaines interventions (déjà EN_COURS) proposent de clôturer directement
  // depuis ce formulaire plutôt que d'exiger un second aller-retour vers le
  // bouton de statut — le rapport et la fin d'intervention arrivent presque
  // toujours ensemble sur le terrain.
  marquerTermineApres: boolean;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [observations, setObservations] = useState("");
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [etapeEnvoi, setEtapeEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const signatureRef = useRef<SignaturePadHandle>(null);

  async function televerserPhoto(fichier: File): Promise<string> {
    const contentType = typeMime(fichier);
    if (!contentType) {
      throw new Error(`Format non pris en charge : ${fichier.name}`);
    }

    const presignRes = await fetch(`/api/interventions/${interventionId}/photos/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomFichier: fichier.name, contentType }),
    });
    const presignData = await presignRes.json();
    if (!presignRes.ok || !presignData.success) {
      throw new Error(presignData.error ?? `Échec de la préparation de l'envoi pour ${fichier.name}`);
    }

    // Upload direct navigateur → R2 : le serveur applicatif ne voit jamais
    // l'octet de la photo (voir app/api/interventions/[id]/photos/presign).
    const uploadRes = await fetch(presignData.data.urlUpload, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fichier,
    });
    if (!uploadRes.ok) {
      throw new Error(`Échec de l'envoi de la photo ${fichier.name}`);
    }

    return presignData.data.urlPublique;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const photos: string[] = [];
      for (let i = 0; i < fichiers.length; i++) {
        setEtapeEnvoi(`Envoi de la photo ${i + 1}/${fichiers.length}…`);
        photos.push(await televerserPhoto(fichiers[i]));
      }

      let signatureUrl: string | undefined;
      const signatureBlob = await signatureRef.current?.exporterPng();
      if (signatureBlob) {
        setEtapeEnvoi("Envoi de la signature…");
        signatureUrl = await televerserPhoto(new File([signatureBlob], "signature.png", { type: "image/png" }));
      }

      setEtapeEnvoi("Enregistrement du rapport…");
      const rapportRes = await fetch(`/api/interventions/${interventionId}/rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || undefined,
          observations: observations || undefined,
          heureFin: new Date().toISOString(),
          photos,
          signatureUrl,
        }),
      });
      const rapportData = await rapportRes.json();
      if (!rapportRes.ok || !rapportData.success) {
        setErreur(rapportData.error ?? "Erreur lors de l'enregistrement du rapport");
        return;
      }

      if (marquerTermineApres) {
        setEtapeEnvoi("Clôture de l'intervention…");
        const statutRes = await fetch(`/api/interventions/${interventionId}/statut`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statut: "COMPLETE" }),
        });
        const statutData = await statutRes.json();
        if (!statutRes.ok || !statutData.success) {
          setErreur(statutData.error ?? "Rapport enregistré, mais la clôture a échoué");
          return;
        }
      }

      onFermer();
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setEnvoi(false);
      setEtapeEnvoi(null);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onFermer}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg bg-white shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-jedco-dark">
            {marquerTermineApres ? "Terminer l'intervention" : "Ajouter un rapport"}
          </h3>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            placeholder="Anomalies constatées, matériel utilisé, suivi recommandé…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Signature du client</label>
          <SignaturePad ref={signatureRef} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Photos</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            capture="environment"
            onChange={(e) => setFichiers(Array.from(e.target.files ?? []))}
            className="w-full text-sm"
          />
          {fichiers.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">{fichiers.length} photo(s) sélectionnée(s)</p>
          )}
        </div>

        {etapeEnvoi && <p className="text-sm text-jedco">{etapeEnvoi}</p>}
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}

        {/* Empilés et pleine largeur plutôt que côte à côte : mêmes
            contraintes tactiles que InterventionTerrainCard.tsx (usage
            terrain, une main, parfois avec des gants). */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={envoi}
            className="w-full rounded-lg bg-jedco px-4 py-3 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
          >
            {envoi ? "Envoi…" : marquerTermineApres ? "Enregistrer et terminer" : "Enregistrer le rapport"}
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
