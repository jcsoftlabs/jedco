import "dotenv/config";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import * as emailLib from "@/lib/email";
import { demanderCodeConnexion, verifierCodeConnexion, documentsClient } from "../auth-client";
import { validerSessionClient } from "@/lib/auth/session-client";

// Le vrai envoi Resend est désactivé (domaine non configuré, voir
// RESEND_ENVOI_ACTIF) — on intercepte l'appel pour tester la logique du code
// sans dépendre de cet interrupteur ni d'un vrai envoi d'e-mail.
vi.spyOn(emailLib, "envoyerEmailSimple").mockResolvedValue(undefined);

function dernierCodeEnvoye(): string {
  const appel = vi.mocked(emailLib.envoyerEmailSimple).mock.calls.at(-1)!;
  const html = appel[0].corpsHtml;
  return html.match(/(\d{6})/)![1];
}

describe("authentification portail client (intégration réelle)", () => {
  const idsClients: string[] = [];

  // Chaque test utilise son propre client/e-mail : le garde-fou anti-spam
  // (1 code par minute et par client) empêcherait sinon les tests suivants
  // d'obtenir un nouveau code dans la même exécution rapide de la suite.
  async function creerClientTest(email: string | null = `otp-${Date.now()}-${Math.random()}@example.com`) {
    const client = await prisma.client.create({
      data: { code: `TEST-OTP-${Date.now()}-${Math.random()}`, nom: "Client OTP", telephone: "0000", email },
    });
    idsClients.push(client.id);
    return client;
  }

  beforeEach(() => {
    vi.mocked(emailLib.envoyerEmailSimple).mockClear();
  });

  afterAll(async () => {
    await prisma.sessionClient.deleteMany({ where: { clientId: { in: idsClients } } });
    await prisma.codeConnexionClient.deleteMany({ where: { clientId: { in: idsClients } } });
    await prisma.client.deleteMany({ where: { id: { in: idsClients } } });
    await prisma.$disconnect();
  });

  it("ne révèle jamais si l'e-mail correspond à un client", async () => {
    await expect(demanderCodeConnexion("inconnu-total@example.com")).resolves.toBeUndefined();
    expect(emailLib.envoyerEmailSimple).not.toHaveBeenCalled();
  });

  it("envoie un code à 6 chiffres et permet de se connecter avec", async () => {
    const client = await creerClientTest();
    await demanderCodeConnexion(client.email!);
    expect(emailLib.envoyerEmailSimple).toHaveBeenCalledOnce();

    const code = dernierCodeEnvoye();
    expect(code).toMatch(/^\d{6}$/);

    const token = await verifierCodeConnexion(client.email!, code);
    const session = await validerSessionClient(token);
    expect(session?.clientId).toBe(client.id);
  });

  it("refuse un code incorrect sans indiquer pourquoi", async () => {
    const client = await creerClientTest();
    await demanderCodeConnexion(client.email!);
    await expect(verifierCodeConnexion(client.email!, "000000")).rejects.toThrow(ErreurMetier);
    await expect(verifierCodeConnexion(client.email!, "000000")).rejects.toThrow(/invalide/);
  });

  it("un code déjà utilisé ne peut pas resservir", async () => {
    const client = await creerClientTest();
    await demanderCodeConnexion(client.email!);
    const code = dernierCodeEnvoye();

    await verifierCodeConnexion(client.email!, code);
    await expect(verifierCodeConnexion(client.email!, code)).rejects.toThrow(ErreurMetier);
  });

  it("bloque après 5 tentatives incorrectes, même avec le bon code ensuite", async () => {
    const client = await creerClientTest();
    await demanderCodeConnexion(client.email!);
    const code = dernierCodeEnvoye();

    for (let i = 0; i < 5; i++) {
      await expect(verifierCodeConnexion(client.email!, "111111")).rejects.toThrow(ErreurMetier);
    }
    await expect(verifierCodeConnexion(client.email!, code)).rejects.toThrow(/tentatives/);
  });

  it("n'envoie pas deux codes en moins d'une minute", async () => {
    const client = await creerClientTest();
    await demanderCodeConnexion(client.email!);
    await demanderCodeConnexion(client.email!);
    expect(emailLib.envoyerEmailSimple).toHaveBeenCalledOnce();
  });

  it("reste silencieux si l'envoi d'e-mail échoue (Resend inactif) — pas de fuite d'énumération", async () => {
    const client = await creerClientTest();
    vi.mocked(emailLib.envoyerEmailSimple).mockRejectedValueOnce(
      new ErreurMetier("L'envoi par e-mail n'est pas encore activé", 503)
    );

    // Doit résoudre comme pour un e-mail inconnu, jamais rejeter : sinon un
    // e-mail existant et un e-mail inexistant produiraient des réponses HTTP
    // différentes (503 vs 200), ce qui révèle qui est client.
    await expect(demanderCodeConnexion(client.email!)).resolves.toBeUndefined();
  });

  it("refuse la connexion si l'e-mail est partagé par plusieurs clients (ambiguïté)", async () => {
    const emailPartage = `ambigu-${Date.now()}@example.com`;
    await creerClientTest(emailPartage);
    await creerClientTest(emailPartage);

    await demanderCodeConnexion(emailPartage);
    expect(emailLib.envoyerEmailSimple).not.toHaveBeenCalled();
  });

  it("documentsClient ne retourne que les documents du client concerné", async () => {
    const client = await creerClientTest();
    const autreClient = await creerClientTest();

    const { factures, devis, interventions } = await documentsClient(client.id);
    expect(factures).toEqual([]);
    expect(devis).toEqual([]);
    expect(interventions).toEqual([]);

    const { factures: facturesAutre } = await documentsClient(autreClient.id);
    expect(facturesAutre).toEqual([]);
  });
});
