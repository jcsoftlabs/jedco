// Affiché automatiquement par Next.js pendant que le composant serveur d'une
// page /admin charge ses données. Placé à la racine du segment, il couvre
// toutes les sous-pages et s'affiche À L'INTÉRIEUR de la coquille : la barre
// latérale et l'en-tête restent en place, seule la zone de contenu clignote —
// l'admin garde ses repères au lieu de voir l'écran entier disparaître.
//
// Un squelette plutôt qu'un simple spinner : il occupe déjà la place des
// cartes et de la table à venir, ce qui évite le saut de mise en page quand
// le contenu réel arrive.
export default function ChargementAdmin() {
  return (
    <div className="max-w-6xl animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement en cours…</span>

      <div className="h-8 w-56 rounded-lg bg-slate-200" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-7 w-32 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="h-9 w-full rounded-lg bg-slate-100" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 w-full rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
