"use client";

import { useEffect } from "react";

// La session dure 7 jours (DUREE_SESSION_MS), mais un admin qui reste
// connecté au-delà tombe déconnecté "tout seul" en plein travail — l'ask
// explicite est qu'aucune déconnexion n'arrive sans geste manuel. Plutôt que
// de repousser encore la durée fixe (repousse juste le mur), ce composant
// prolonge la session en continu tant que le backoffice reste ouvert : sans
// activité du tout pendant 7 jours pleins, la session finit par expirer —
// mais jamais pendant un usage actif, même sporadique.
const INTERVALLE_MS = 20 * 60 * 1000; // 20 minutes — largement sous les 7 jours

export default function SessionKeepAlive() {
  useEffect(() => {
    function renouveler() {
      // Volontairement silencieux en cas d'échec (réseau coupé, session
      // déjà expirée) : ce n'est qu'un rafraîchissement en arrière-plan, pas
      // une action que l'admin a demandée — un échec ne doit rien afficher.
      fetch("/api/auth/renouveler", { method: "POST" }).catch(() => {});
    }
    const id = setInterval(renouveler, INTERVALLE_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
