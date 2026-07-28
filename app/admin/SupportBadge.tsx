"use client";

import { useEffect, useState } from "react";

const INTERVALLE_MS = 30_000;

// Pastille sur le lien "Support" de la nav — seul repère visible pour un
// compte SUPPORT, qui n'a pas la cloche de notifications (réservée à
// ADMIN/SUPERVISEUR, voir AdminShell). Sans elle, un agent sur /admin/manuel
// ou tout autre onglet ADMIN ne saurait pas qu'un client attend en direct
// tant qu'il ne retourne pas manuellement sur /admin/support.
export default function SupportBadge() {
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    let annule = false;
    async function verifier() {
      try {
        const res = await fetch("/api/support/conversations");
        const data = await res.json();
        if (!annule && data.success) setNombre(data.data.enAttente.length);
      } catch {
        // Silencieux — la vérification suivante rattrapera. Inclut le 403
        // attendu pour un rôle SUPERVISEUR (endpoint réservé à ADMIN/SUPPORT).
      }
    }
    verifier();
    const id = setInterval(verifier, INTERVALLE_MS);
    return () => {
      annule = true;
      clearInterval(id);
    };
  }, []);

  if (nombre === 0) return null;

  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {nombre > 9 ? "9+" : nombre}
    </span>
  );
}
