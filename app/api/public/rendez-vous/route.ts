import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { creerRendezVousSchema } from "@/lib/schemas/rendez-vous";
import { creerRendezVous } from "@/lib/services/rendez-vous";
import { envoyerNotificationRendezVous } from "@/lib/services/notifications";
import { logger } from "@/lib/logger";

// Seule route de prise de rendez-vous, accessible sans authentification —
// même traitement que /api/public/demandes-devis : la demande est
// sauvegardée avant toute tentative de notification par e-mail, pour qu'une
// panne d'envoi ne fasse jamais disparaître le rendez-vous pour le prospect.
export const POST = routeApi(async (req) => {
  const body = creerRendezVousSchema.parse(await req.json());
  const rdv = await creerRendezVous(body);

  try {
    await envoyerNotificationRendezVous(rdv);
  } catch (err) {
    logger.warn({ err }, "notification e-mail du nouveau rendez-vous non envoyée");
  }

  return reponseOk(
    { id: rdv.id },
    { status: 201, message: "Rendez-vous demandé — notre équipe le confirmera rapidement." }
  );
});
