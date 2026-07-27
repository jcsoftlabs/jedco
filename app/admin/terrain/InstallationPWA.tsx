"use client";

import { useEffect, useState } from "react";

// Chrome/Edge n'affichent leur invite d'installation qu'en réponse à ce
// geste utilisateur explicite — un `beforeinstallprompt` non intercepté
// disparaît silencieusement, on doit donc le capter tôt et le rejouer sur
// clic. Sur iOS Safari, cet événement n'existe pas du tout (installation
// manuelle via "Partager → Sur l'écran d'accueil") : le bandeau ne s'affiche
// donc que quand l'événement arrive réellement.
type EvenementInstallation = Event & { prompt: () => Promise<void> };

export default function InstallationPWA() {
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);
  const [installee, setInstallee] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Pas de blocage de l'UI si l'enregistrement échoue (navigateur trop
        // ancien, contexte non sécurisé en dev) — l'app reste utilisable en
        // ligne, seule l'installation/le hors-ligne ne fonctionnent pas.
      });
    }

    function surPropositionInstallation(e: Event) {
      e.preventDefault();
      setEvenement(e as EvenementInstallation);
    }
    window.addEventListener("beforeinstallprompt", surPropositionInstallation);

    function surInstallation() {
      setInstallee(true);
      setEvenement(null);
    }
    window.addEventListener("appinstalled", surInstallation);

    return () => {
      window.removeEventListener("beforeinstallprompt", surPropositionInstallation);
      window.removeEventListener("appinstalled", surInstallation);
    };
  }, []);

  if (!evenement || installee) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-jedco/30 bg-jedco/5 px-4 py-3">
      <p className="text-sm text-jedco-dark">Installer cette page sur l&apos;écran d&apos;accueil pour un accès rapide, même hors ligne.</p>
      <button
        onClick={async () => {
          await evenement.prompt();
          setEvenement(null);
        }}
        className="shrink-0 rounded-lg bg-jedco px-3 py-1.5 text-sm font-semibold text-white hover:bg-jedco-light transition"
      >
        Installer
      </button>
    </div>
  );
}
