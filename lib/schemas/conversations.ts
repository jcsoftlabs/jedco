import { z } from "zod";

export const messageChatSchema = z.object({
  sessionId: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(4000),
});

export const repondreConversationSchema = z.object({
  contenu: z.string().trim().min(1).max(4000),
});

export type MessageChatInput = z.infer<typeof messageChatSchema>;
export type RepondreConversationInput = z.infer<typeof repondreConversationSchema>;
