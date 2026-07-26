"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PhotoCard({
  media,
}: {
  media: { id: string; url: string; legende: string | null; publieGalerie: boolean };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function basculerPublie() {
    setEnvoi(true);
    try {
      await fetch(`/api/galerie/${media.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publieGalerie: !media.publieGalerie }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimer() {
    if (!confirm("Supprimer cette photo définitivement ?")) return;
    setEnvoi(true);
    try {
      await fetch(`/api/galerie/${media.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt={media.legende ?? ""} className="h-32 w-full object-cover" />
      <div className="p-2">
        {media.legende && <p className="truncate text-xs text-slate-500">{media.legende}</p>}
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            media.publieGalerie ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {media.publieGalerie ? "PUBLIÉE" : "MASQUÉE"}
        </span>
        <div className="mt-2 flex gap-1">
          <button
            disabled={envoi}
            onClick={basculerPublie}
            className="flex-1 text-xs rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {media.publieGalerie ? "Masquer" : "Publier"}
          </button>
          <button
            disabled={envoi}
            onClick={supprimer}
            className="text-xs rounded border border-red-300 px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
