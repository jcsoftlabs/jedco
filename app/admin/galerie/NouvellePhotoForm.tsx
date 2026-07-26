"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NouvellePhotoForm() {
  const router = useRouter();
  const [fichier, setFichier] = useState<File | null>(null);
  const [legende, setLegende] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fichier) return;
    setErreur(null);
    setEnvoi(true);

    try {
      const contentType = typeMime(fichier);
      if (!contentType) throw new Error(`Format non pris en charge : ${fichier.name}`);

      const presignRes = await fetch("/api/galerie/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomFichier: fichier.name, contentType }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.error ?? "Échec de la préparation de l'envoi");
      }

      const uploadRes = await fetch(presignData.data.urlUpload, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: fichier,
      });
      if (!uploadRes.ok) throw new Error("Échec de l'envoi de la photo");

      const creerRes = await fetch("/api/galerie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: presignData.data.urlPublique, legende: legende || undefined }),
      });
      const creerData = await creerRes.json();
      if (!creerRes.ok || !creerData.success) {
        throw new Error(creerData.error ?? "Échec de l'enregistrement");
      }

      setFichier(null);
      setLegende("");
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
        className="w-full text-sm"
      />
      <input
        placeholder="Légende (optionnel)"
        value={legende}
        onChange={(e) => setLegende(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <button
        type="submit"
        disabled={envoi || !fichier}
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
      >
        {envoi ? "Envoi…" : "Ajouter à la galerie"}
      </button>
    </form>
  );
}
