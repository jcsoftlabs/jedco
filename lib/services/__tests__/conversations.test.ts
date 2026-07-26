import "dotenv/config";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import {
  traiterMessageVisiteur,
  obtenirOuCreerConversation,
  listerConversationsEnAttente,
  listerConversationsAgent,
  prendreEnCharge,
  repondreConversation,
  fermerConversation,
} from "../conversations";

function reponseAnthropicOk(texte: string) {
  return { ok: true, json: async () => ({ content: [{ type: "text", text: texte }] }) } as Response;
}

describe("module Conversations — Tiffany hybride IA/humain (intégration réelle)", () => {
  const idsConversations: string[] = [];
  let agentId: string;

  beforeAll(async () => {
    const agent = await prisma.user.create({
      data: {
        email: `test-support-${Date.now()}@jedco.test`,
        passwordHash: "x",
        nom: "Support",
        prenom: "Test",
        role: "SUPPORT",
      },
    });
    agentId = agent.id;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await prisma.messageConversation.deleteMany({ where: { conversationId: { in: idsConversations } } });
    await prisma.conversation.deleteMany({ where: { id: { in: idsConversations } } });
    await prisma.user.delete({ where: { id: agentId } });
    await prisma.$disconnect();
  });

  it("répond via l'IA quand l'appel réussit, reste en statut IA", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reponseAnthropicOk("Diagnostic : ... Service recommandé : Vidange.")));

    const sessionId = `test-session-${Date.now()}-a`;
    const resultat = await traiterMessageVisiteur(sessionId, "Ma fosse déborde à Delmas");

    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    expect(resultat.statut).toBe("IA");
    expect(resultat.reply).toContain("Vidange");
    expect(conversation.statut).toBe("IA");
    expect(conversation.messages.map((m) => m.role)).toEqual(["VISITEUR", "IA"]);
  });

  it("bascule vers un agent humain dès que l'appel IA échoue, sans réessayer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: { message: "quota dépassé" } }) }));

    const sessionId = `test-session-${Date.now()}-b`;
    const resultat = await traiterMessageVisiteur(sessionId, "Bonjour");

    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    expect(resultat.statut).toBe("EN_ATTENTE_AGENT");
    expect(conversation.statut).toBe("EN_ATTENTE_AGENT");
    // Un seul appel fetch : pas de nouvelle tentative après l'échec.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(conversation.messages.some((m) => m.role === "IA")).toBe(true);
  });

  it("un deuxième message sur une conversation déjà en attente n'appelle plus l'IA", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    const sessionId = `test-session-${Date.now()}-c`;
    await traiterMessageVisiteur(sessionId, "Premier message");
    fetchMock.mockClear();

    const resultat = await traiterMessageVisiteur(sessionId, "Deuxième message, toujours personne ?");

    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    expect(resultat.reply).toBeNull();
    expect(resultat.statut).toBe("EN_ATTENTE_AGENT");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(conversation.messages.filter((m) => m.role === "VISITEUR")).toHaveLength(2);
  });

  it("listerConversationsEnAttente ne renvoie que les conversations EN_ATTENTE_AGENT", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }));
    const sessionId = `test-session-${Date.now()}-d`;
    await traiterMessageVisiteur(sessionId, "En attente");
    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    const enAttente = await listerConversationsEnAttente();
    expect(enAttente.some((c) => c.id === conversation.id)).toBe(true);
  });

  it("prendreEnCharge assigne l'agent et refuse une conversation qui n'est pas en attente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }));
    const sessionId = `test-session-${Date.now()}-e`;
    await traiterMessageVisiteur(sessionId, "Prise en charge");
    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    const prise = await prendreEnCharge(conversation.id, agentId);
    expect(prise?.statut).toBe("PRISE_EN_CHARGE");
    expect(prise?.agentId).toBe(agentId);

    await expect(prendreEnCharge(conversation.id, agentId)).rejects.toThrow(ErreurMetier);
  });

  it("repondreConversation ajoute un message AGENT et prend en charge implicitement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }));
    const sessionId = `test-session-${Date.now()}-f`;
    await traiterMessageVisiteur(sessionId, "Répondez-moi");
    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    const repondue = await repondreConversation(conversation.id, agentId, "Bonjour, je prends le relais.");
    expect(repondue?.statut).toBe("PRISE_EN_CHARGE");
    expect(repondue?.agentId).toBe(agentId);
    expect(repondue?.messages.at(-1)?.role).toBe("AGENT");

    const mesConversations = await listerConversationsAgent(agentId);
    expect(mesConversations.some((c) => c.id === conversation.id)).toBe(true);
  });

  it("fermerConversation empêche toute nouvelle réponse tant qu'elle reste fermée", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }));
    const sessionId = `test-session-${Date.now()}-g`;
    await traiterMessageVisiteur(sessionId, "À fermer");
    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    await repondreConversation(conversation.id, agentId, "Voilà qui règle votre problème.");
    const fermee = await fermerConversation(conversation.id);
    expect(fermee?.statut).toBe("FERMEE");

    await expect(repondreConversation(conversation.id, agentId, "trop tard")).rejects.toThrow(ErreurMetier);
  });

  it("un visiteur qui réécrit après fermeture rouvre le ticket en attente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: {} }) }));
    const sessionId = `test-session-${Date.now()}-h`;
    await traiterMessageVisiteur(sessionId, "Premier souci");
    const conversation = await obtenirOuCreerConversation(sessionId);
    idsConversations.push(conversation.id);

    await repondreConversation(conversation.id, agentId, "Réglé !");
    await fermerConversation(conversation.id);

    const resultat = await traiterMessageVisiteur(sessionId, "En fait ça ne marche toujours pas");
    expect(resultat.statut).toBe("EN_ATTENTE_AGENT");
  });
});
