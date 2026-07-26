import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ErreurMetier } from "@/lib/errors";

const SYSTEM_PROMPT =
  "Tu es Tiffany, l'assistante virtuelle de JEDCO Services S.A., entreprise haïtienne d'assainissement depuis 1994. Tu parles en français professionnel et chaleureux. Analyse le problème de l'utilisateur puis recommande le service JEDCO le plus adapté parmi: Vidange de fosses septiques, Collecte d'ordures, Toilettes mobiles, Pest Control, Nettoyage industriel, Contrats municipaux. Structure ta réponse en 3 parties: Diagnostic, Service recommandé, Prochaine étape. Mentionne la zone si fournie et propose de contacter JEDCO au 2942-1109 / 2942-1110.";

const MESSAGE_BASCULE_HUMAIN =
  "Je rencontre une difficulté technique en ce moment. Je transmets votre message à un membre de notre équipe, qui vous répondra ici même dans quelques instants.";

const INCLUDE_MESSAGES = {
  messages: { orderBy: { createdAt: "asc" } },
} as const;

export async function obtenirOuCreerConversation(sessionId: string) {
  return prisma.conversation.upsert({
    where: { sessionId },
    create: { sessionId },
    update: {},
    include: INCLUDE_MESSAGES,
  });
}

export async function obtenirConversation(id: string) {
  return prisma.conversation.findUnique({ where: { id }, include: INCLUDE_MESSAGES });
}

async function ajouterMessage(conversationId: string, role: "VISITEUR" | "IA" | "AGENT", contenu: string) {
  await prisma.messageConversation.create({ data: { conversationId, role, contenu } });
  // updatedAt sert de tri pour le tableau de bord support (les conversations
  // actives remontent en premier) — touché explicitement puisqu'un create
  // sur la table enfant ne le déclenche pas automatiquement côté parent.
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

async function appellerIA(message: string): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ErreurMetier("Clé API Anthropic manquante", 503);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ErreurMetier(data?.error?.message ?? "Échec de l'appel à l'IA", 502);
  }

  const data = await res.json();
  const reply = Array.isArray(data.content)
    ? data.content
        .filter((b: { type: string }) => b.type === "text")
        .map((b: { text: string }) => b.text)
        .join("\n\n")
    : "";

  if (!reply) throw new ErreurMetier("Réponse IA vide", 502);
  return reply;
}

// Point d'entrée du widget public : enregistre le message du visiteur, tente
// l'IA si la conversation est encore en mode IA, bascule vers un agent humain
// dès le premier échec technique (clé absente, panne, quota) plutôt que de
// réessayer indéfiniment — Tiffany ne fait qu'un seul essai par message.
export async function traiterMessageVisiteur(sessionId: string, message: string) {
  const conversation = await obtenirOuCreerConversation(sessionId);

  // Un message sur une conversation fermée rouvre un ticket — jamais un
  // visiteur qui écrit à nouveau ne doit tomber dans un silence côté agent.
  const statutDepart = conversation.statut === "FERMEE" ? "EN_ATTENTE_AGENT" : conversation.statut;
  if (statutDepart !== conversation.statut) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { statut: statutDepart } });
  }

  await ajouterMessage(conversation.id, "VISITEUR", message);

  if (statutDepart !== "IA") {
    return { reply: null, statut: statutDepart };
  }

  try {
    const reply = await appellerIA(message);
    await ajouterMessage(conversation.id, "IA", reply);
    return { reply, statut: "IA" as const };
  } catch (err) {
    logger.warn({ err }, "Tiffany indisponible — bascule vers un agent humain");
    await prisma.conversation.update({ where: { id: conversation.id }, data: { statut: "EN_ATTENTE_AGENT" } });
    await ajouterMessage(conversation.id, "IA", MESSAGE_BASCULE_HUMAIN);
    return { reply: MESSAGE_BASCULE_HUMAIN, statut: "EN_ATTENTE_AGENT" as const };
  }
}

export async function listerConversationsEnAttente() {
  return prisma.conversation.findMany({
    where: { statut: "EN_ATTENTE_AGENT" },
    orderBy: { updatedAt: "asc" },
    include: INCLUDE_MESSAGES,
  });
}

export async function listerConversationsAgent(agentId: string) {
  return prisma.conversation.findMany({
    where: { agentId, statut: "PRISE_EN_CHARGE" },
    orderBy: { updatedAt: "desc" },
    include: INCLUDE_MESSAGES,
  });
}

export async function prendreEnCharge(conversationId: string, agentId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.statut !== "EN_ATTENTE_AGENT") {
    throw new ErreurMetier("Cette conversation n'est plus en attente", 400);
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: { statut: "PRISE_EN_CHARGE", agentId },
    include: INCLUDE_MESSAGES,
  });
}

export async function repondreConversation(conversationId: string, agentId: string, contenu: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.statut === "FERMEE") {
    throw new ErreurMetier("Cette conversation est fermée", 400);
  }
  // Un agent qui répond à une conversation encore en attente la prend en
  // charge implicitement — pas besoin d'un clic "Prendre en charge" séparé
  // si on répond directement depuis la liste d'attente.
  if (conversation.statut !== "PRISE_EN_CHARGE" || conversation.agentId !== agentId) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { statut: "PRISE_EN_CHARGE", agentId },
    });
  }

  await ajouterMessage(conversationId, "AGENT", contenu);
  return obtenirConversation(conversationId);
}

export async function fermerConversation(conversationId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;

  return prisma.conversation.update({ where: { id: conversationId }, data: { statut: "FERMEE" } });
}
