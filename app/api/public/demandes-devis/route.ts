import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { creerDemandeDevisSchema } from "@/lib/schemas/demandes-devis";
import { creerDemandeDevis } from "@/lib/services/demandes-devis";

// Seule route de l'app accessible sans authentification, en dehors de
// /api/auth/login et /api/chat — le formulaire "Demande de contact" de la
// page d'accueil publique. La validation Zod stricte du schéma est donc la
// seule barrière avant écriture en base.
export const POST = routeApi(async (req) => {
  const body = creerDemandeDevisSchema.parse(await req.json());
  const demande = await creerDemandeDevis(body);

  return reponseOk(
    { id: demande.id },
    { status: 201, message: "Demande envoyée — notre équipe vous contactera rapidement." }
  );
});
