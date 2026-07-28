import { randomInt, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { envoyerEmailSimple } from "@/lib/email";
import { creerSessionClient, type MetaSessionClient } from "@/lib/auth/session-client";
import { logger } from "@/lib/logger";

const DUREE_CODE_MS = 10 * 60 * 1000; // 10 minutes
const DELAI_MIN_ENTRE_DEMANDES_MS = 60 * 1000; // anti-spam : 1 code par minute
const TENTATIVES_MAX = 5;

function hacherCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// Ambiguïté volontairement traitée comme "aucun client" : si plusieurs
// fiches partagent le même e-mail (saisie en double par le personnel), on ne
// peut pas savoir en toute sécurité laquelle authentifier — mieux vaut
// refuser silencieusement que risquer d'ouvrir le dossier d'un autre client.
async function trouverClientUnique(email: string) {
  const clients = await prisma.client.findMany({
    where: { email: { equals: email, mode: "insensitive" }, actif: true, deletedAt: null },
  });
  return clients.length === 1 ? clients[0] : null;
}

// Ne révèle jamais si l'e-mail correspond à un client (protection contre
// l'énumération) : le même message générique est renvoyé par la route API
// que le client existe ou non. Cette fonction ne lève que pour des raisons
// opérationnelles (Resend non configuré), jamais pour "e-mail inconnu".
export async function demanderCodeConnexion(email: string): Promise<void> {
  const client = await trouverClientUnique(email);
  if (!client) return;

  const dernierCode = await prisma.codeConnexionClient.findFirst({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
  });
  if (dernierCode && Date.now() - dernierCode.createdAt.getTime() < DELAI_MIN_ENTRE_DEMANDES_MS) {
    // Ne rien envoyer de plus, mais ne pas non plus signaler l'anti-spam au
    // client final — même silence que pour un e-mail inconnu.
    return;
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await prisma.codeConnexionClient.create({
    data: {
      clientId: client.id,
      codeHash: hacherCode(code),
      expiresAt: new Date(Date.now() + DUREE_CODE_MS),
    },
  });

  try {
    await envoyerEmailSimple({
      destinataire: client.email!,
      sujet: "Votre code de connexion JEDCO",
      corpsHtml: `
        <p>Bonjour ${client.nom},</p>
        <p>Voici votre code de connexion à l'espace client JEDCO :</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${code}</p>
        <p>Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      `,
    });
  } catch (err) {
    // Ne JAMAIS répercuter cet échec à l'appelant : la route renvoie le même
    // message générique qu'un e-mail inconnu (protection anti-énumération,
    // voir trouverClientUnique ci-dessus). Tant que Resend reste désactivé
    // (RESEND_ENVOI_ACTIF), CHAQUE demande pour un client existant finit
    // ici — visible uniquement dans les logs serveur, jamais côté visiteur.
    logger.error({ err, clientId: client.id }, "échec de l'envoi du code de connexion client");
  }
}

export async function verifierCodeConnexion(
  email: string,
  code: string,
  meta: MetaSessionClient = {}
): Promise<string> {
  const client = await trouverClientUnique(email);
  if (!client) throw new ErreurMetier("Code invalide ou expiré", 401);

  const dernierCode = await prisma.codeConnexionClient.findFirst({
    where: { clientId: client.id, utiliseAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!dernierCode || dernierCode.expiresAt.getTime() < Date.now()) {
    throw new ErreurMetier("Code invalide ou expiré", 401);
  }
  if (dernierCode.tentatives >= TENTATIVES_MAX) {
    throw new ErreurMetier("Trop de tentatives — redemandez un nouveau code", 429);
  }

  if (dernierCode.codeHash !== hacherCode(code)) {
    await prisma.codeConnexionClient.update({
      where: { id: dernierCode.id },
      data: { tentatives: { increment: 1 } },
    });
    throw new ErreurMetier("Code invalide ou expiré", 401);
  }

  await prisma.codeConnexionClient.update({
    where: { id: dernierCode.id },
    data: { utiliseAt: new Date() },
  });

  return creerSessionClient(client.id, meta);
}

// Historique du client connecté — factures, devis et interventions, du plus
// récent au plus ancien. Pas de pagination : le volume par client reste
// faible en pratique.
export async function documentsClient(clientId: string) {
  const [factures, devis, interventions] = await Promise.all([
    prisma.facture.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { dateEmission: "desc" },
      select: {
        id: true,
        reference: true,
        statut: true,
        totalHTG: true,
        dateEmission: true,
        dateEcheance: true,
      },
    }),
    prisma.devis.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { dateEmission: "desc" },
      select: {
        id: true,
        reference: true,
        statut: true,
        totalHTG: true,
        dateEmission: true,
        dateValidite: true,
      },
    }),
    // Le client voit le SERVICE rendu (ce qui a été fait chez lui), pas le
    // détail opérationnel interne : ni le technicien assigné, ni le
    // véhicule, ni les photos/la signature du rapport — ces informations
    // restent réservées au backoffice (voir /admin/interventions/[id]).
    prisma.intervention.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        type: true,
        statut: true,
        ville: true,
        datePlanifiee: true,
        dateExecution: true,
      },
    }),
  ]);

  return { factures, devis, interventions };
}
