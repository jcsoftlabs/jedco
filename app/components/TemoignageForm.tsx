"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TemoignageForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const res = await fetch("/api/public/temoignages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, type, note, commentaire }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErreur(data.error ?? "Erreur");
        return;
      }
      setEnvoye(true);
      setNom("");
      setType("");
      setNote(5);
      setCommentaire("");
      // Le témoignage est déjà en base (pas de modération) : on rafraîchit
      // pour que ce visiteur le voie apparaître dans la liste au-dessus,
      // sans attendre les 60s d'ISR (revalidatePath côté route API).
      router.refresh();
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="mx-auto mt-14 max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="text-lg font-semibold text-jedco-dark">Laisser un témoignage</h3>
      <p className="mt-1 text-sm text-slate-500">
        Votre témoignage sera publié immédiatement sur cette page.
      </p>

      {envoye && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Merci pour votre témoignage — il est maintenant visible ci-dessus.
        </p>
      )}

      <form onSubmit={soumettre} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="nom" className="mb-1 block text-sm font-medium text-slate-700">
              Votre nom
            </label>
            <input
              id="nom"
              required
              maxLength={200}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
            />
          </div>
          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">
              Entreprise / Fonction
            </label>
            <input
              id="type"
              required
              maxLength={200}
              placeholder="Ex : Gérant, Restaurant Le Palmier"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNote(n)}
                aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                className={n <= note ? "text-jedco" : "text-slate-300"}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="commentaire" className="mb-1 block text-sm font-medium text-slate-700">
            Votre commentaire
          </label>
          <textarea
            id="commentaire"
            required
            maxLength={1000}
            rows={4}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-jedco"
          />
        </div>

        {erreur && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-lg bg-jedco px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-jedco-light disabled:opacity-60 sm:w-auto"
        >
          {envoi ? "Envoi…" : "Publier mon témoignage"}
        </button>
      </form>
    </div>
  );
}
