"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function handleLogout() {
    setEnvoi(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={envoi}
      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-60"
    >
      {envoi ? "…" : "Se déconnecter"}
    </button>
  );
}
