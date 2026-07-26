"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TechnicienRow({
  technicien,
}: {
  technicien: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    email: string;
    specialites: string[];
    zonesAssignees: string[];
    disponible: boolean;
  };
}) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);

  async function basculerDisponible() {
    setEnvoi(true);
    try {
      await fetch(`/api/techniciens/${technicien.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponible: !technicien.disponible }),
      });
      router.refresh();
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 px-4 font-mono text-xs">{technicien.matricule}</td>
      <td className="px-4">
        {technicien.prenom} {technicien.nom}
      </td>
      <td className="px-4 text-slate-500">{technicien.email}</td>
      <td className="px-4 text-slate-500">{technicien.specialites.join(", ") || "—"}</td>
      <td className="px-4 text-slate-500">{technicien.zonesAssignees.join(", ") || "—"}</td>
      <td className="px-4">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            technicien.disponible ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
          }`}
        >
          {technicien.disponible ? "DISPONIBLE" : "INDISPONIBLE"}
        </span>
      </td>
      <td className="px-4 py-2">
        <button
          disabled={envoi}
          onClick={basculerDisponible}
          className="text-xs rounded border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-60"
        >
          {technicien.disponible ? "Marquer indisponible" : "Marquer disponible"}
        </button>
      </td>
    </tr>
  );
}
