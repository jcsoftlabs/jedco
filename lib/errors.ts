// Erreur de règle métier (contrat ponctuel non renouvelable, client
// introuvable pour une création, transition de statut invalide…) —
// distincte d'une ressource introuvable à l'URL demandée (celle-ci reste
// représentée par un retour `null` du service, traduit en 404 par la route).
// Catchée par routeApi (lib/api/error-handler.ts) et traduite dans l'enveloppe
// de réponse uniforme avec le status HTTP approprié.
export class ErreurMetier extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ErreurMetier";
    this.status = status;
  }
}
