import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { messageChatSchema } from "@/lib/schemas/conversations";
import { traiterMessageVisiteur, obtenirOuCreerConversation } from "@/lib/services/conversations";

// Route publique sans authentification (widget vitrine, comme
// /api/public/demandes-devis) — sessionId généré et conservé côté client
// (localStorage), jamais un identifiant de compte.
export const POST = routeApi(async (req) => {
  const { sessionId, message, nom, telephone, email } = messageChatSchema.parse(await req.json());
  const resultat = await traiterMessageVisiteur(sessionId, message, { nom, telephone, email });
  return reponseOk(resultat);
});

// Le widget interroge cette route toutes les ~4s une fois basculé en mode
// humain, pour récupérer les réponses de l'agent sans callback serveur→client.
export const GET = routeApi(async (req) => {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return reponseOk({ statut: "IA", messages: [] });

  const conversation = await obtenirOuCreerConversation(sessionId);
  return reponseOk({
    statut: conversation.statut,
    messages: conversation.messages.map((m) => ({ id: m.id, role: m.role, contenu: m.contenu, createdAt: m.createdAt })),
  });
});
