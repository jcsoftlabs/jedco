"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OptionType = { code: string; libelle: string };

export default function NouveauTechnicienForm({ typesService }: { typesService: OptionType[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [specialites, setSpecialites] = useState<string[]>([]);
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function basculerSpecialite(type: string) {
    setSpecialites((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    const fd = new FormData(e.currentTarget);
    const zonesAssignees = String(fd.get("zonesAssignees") ?? "")
      .split(",")
      .map((z) => z.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/techniciens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          motDePasse: fd.get("motDePasse"),
          prenom: fd.get("prenom"),
          nom: fd.get("nom"),
          telephone: fd.get("telephone") || undefined,
          specialites,
          zonesAssignees,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur lors de la création");
        return;
      }
      setSpecialites([]);
      setOuvert(false);
      router.refresh();
    } catch {
      setErreur("Connexion impossible.");
    } finally {
      setEnvoi(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        + Nouveau technicien
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 max-w-md">
      <div className="flex gap-2">
        <input name="prenom" placeholder="Prénom" required className="w-1/2 rounded border border-slate-300 px-3 py-2 text-sm" />
        <input name="nom" placeholder="Nom" required className="w-1/2 rounded border border-slate-300 px-3 py-2 text-sm" />
      </div>
      <input name="email" type="email" placeholder="E-mail (identifiant de connexion)" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
      <input name="telephone" placeholder="Téléphone (optionnel)" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />

      <div className="relative">
        <input
          name="motDePasse"
          type={motDePasseVisible ? "text" : "password"}
          placeholder="Mot de passe initial (12 caractères min.)"
          required
          minLength={12}
          className="w-full rounded border border-slate-300 px-3 py-2 pr-16 text-sm"
        />
        <button
          type="button"
          onClick={() => setMotDePasseVisible((v) => !v)}
          className="absolute inset-y-0 right-0 px-3 text-xs text-slate-500 hover:text-slate-700"
        >
          {motDePasseVisible ? "Masquer" : "Afficher"}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Communiquez ce mot de passe au technicien de vive voix — il n&apos;est jamais réaffiché ensuite.
      </p>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Spécialités</label>
        <div className="flex flex-wrap gap-2">
          {typesService.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => basculerSpecialite(t.code)}
              className={`text-xs rounded-full border px-2.5 py-1 ${
                specialites.includes(t.code)
                  ? "border-jedco bg-jedco/10 text-jedco"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.libelle}
            </button>
          ))}
        </div>
      </div>

      <input
        name="zonesAssignees"
        placeholder="Zones assignées, séparées par des virgules (optionnel)"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />

      {erreur && <p className="text-sm text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={envoi}
          className="rounded-lg bg-jedco px-4 py-2 text-sm font-semibold text-white hover:bg-jedco-light transition disabled:opacity-60"
        >
          {envoi ? "…" : "Créer"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
