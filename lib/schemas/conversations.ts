import { z } from "zod";

export const messageChatSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(4000),
  // Envoyés uniquement avec le tout premier message d'une conversation (voir
  // ChatWidget.tsx) — un meilleur suivi pour l'agent qui prend le relais que
  // "Nouveau visiteur" sans coordonnées.
  nom: z.string().trim().min(1).max(200).optional(),
  telephone: z.string().trim().min(1).max(30).optional(),
  email: z.email().optional(),
});

export const repondreConversationSchema = z.object({
  contenu: z.string().trim().min(1).max(4000),
});

export type MessageChatInput = z.infer<typeof messageChatSchema>;
export type RepondreConversationInput = z.infer<typeof repondreConversationSchema>;
