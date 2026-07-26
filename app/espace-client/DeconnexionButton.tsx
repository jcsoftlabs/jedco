"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeconnexionButton() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function deconnecter() {
    setEnvoi(true);
    try {
      await fetch("/api/espace-client/deconnexion", { method: "POST" });
      router.push("/espace-client/connexion");
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <button
      onClick={deconnecter}
      disabled={envoi}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-60"
    >
      Se déconnecter
    </button>
  );
}
