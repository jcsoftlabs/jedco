export async function register() {
  // Force la validation des variables d'environnement (lib/env.ts) au démarrage
  // du serveur — l'application refuse de démarrer plutôt que d'échouer sur la
  // première requête en production.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./lib/env");
  }
}
