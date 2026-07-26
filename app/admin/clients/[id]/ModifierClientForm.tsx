"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  nom: string;
  type: string;
  telephone: string;
  ville: string;
  adresse: string | null;
  email: string | null;
};

export default function ModifierClientForm({ client }: { client: Client }) {
  const router = useRouter();
  const [modification, setModification] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);
    // Contrairement à NouveauClientForm, on n'omet PAS les champs vides ici :
    // une adresse/e-mail laissé vide dans ce formulaire d'édition (pré-rempli
    // avec la valeur actuelle) signifie "effacer ce champ", pas "ne rien
    // envoyer" — modifierClientSchema (lib/schemas/clients.ts) convertit la
    // chaîne vide en null pour ces deux champs.
    const body = Object.fromEntries(fd.entries());

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la modification");
        return;
      }
      setModification(false);
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!modification) {
    return (
      <div>
        <p className="text-sm text-slate-500">
          {client.type} — {client.ville} — {client.telephone}
        </p>
        {(client.adresse || client.email) && (
          <p className="text-sm text-slate-500">
            {[client.adresse, client.email].filter(Boolean).join(" — ")}
          </p>
        )}
        <button
          onClick={() => setModification(true)}
          className="mt-2 text-sm text-jedco hover:underline"
        >
          Modifier les infos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <input
        name="nom"
        placeholder="Nom"
        required
        defaultValue={client.nom}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        name="type"
        defaultValue={client.type}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="PARTICULIER">Particulier</option>
        <option value="ENTREPRISE">Entreprise</option>
        <option value="INSTITUTION">Institution</option>
        <option value="ONG">ONG</option>
      </select>
      <input
        name="telephone"
        placeholder="Téléphone"
        required
        defaultValue={client.telephone}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="ville"
        placeholder="Ville"
        defaultValue={client.ville}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="adresse"
        placeholder="Adresse (optionnel)"
        defaultValue={client.adresse ?? ""}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <input
        name="email"
        type="email"
        placeholder="Adresse e-mail (optionnel)"
        defaultValue={client.email ?? ""}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => setModification(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
