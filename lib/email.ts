import { Resend } from "resend";
import { env } from "@/lib/env";
import { ErreurMetier } from "@/lib/errors";

let client: Resend | null = null;

function resendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new ErreurMetier("RESEND_API_KEY n'est pas configurée", 500);
  }
  if (!client) client = new Resend(env.RESEND_API_KEY);
  return client;
}

// Interrupteur séparé de la présence de RESEND_API_KEY (voir lib/env.ts) — le
// domaine d'envoi n'est pas encore vérifié côté Resend. Le code reste
// entièrement branché (service, routes, UI) mais ne part réellement que
// lorsque RESEND_ENVOI_ACTIF passe à "true" en production.
function verifierEnvoiActif(): void {
  if (!env.RESEND_ENVOI_ACTIF) {
    throw new ErreurMetier(
      "L'envoi par e-mail n'est pas encore activé (domaine d'envoi en attente de vérification sur Resend)",
      503
    );
  }
  if (!env.RESEND_FROM_EMAIL) {
    throw new ErreurMetier("RESEND_FROM_EMAIL n'est pas configurée", 500);
  }
}

export async function envoyerEmailAvecPDF(input: {
  destinataire: string;
  sujet: string;
  corpsHtml: string;
  pdf: Buffer;
  nomFichier: string;
}): Promise<void> {
  verifierEnvoiActif();

  const { error } = await resendClient().emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.destinataire,
    subject: input.sujet,
    html: input.corpsHtml,
    attachments: [{ filename: input.nomFichier, content: input.pdf }],
  });

  if (error) {
    throw new ErreurMetier(`Échec de l'envoi de l'e-mail : ${error.message}`, 502);
  }
}

// Notification interne (nouvelle demande de devis, etc.) — même interrupteur
// que ci-dessus mais sans pièce jointe, pour ne pas forcer un genererXPDF
// inutile aux appelants qui n'ont rien à joindre.
export async function envoyerEmailSimple(input: {
  destinataire: string;
  sujet: string;
  corpsHtml: string;
}): Promise<void> {
  verifierEnvoiActif();

  const { error } = await resendClient().emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to: input.destinataire,
    subject: input.sujet,
    html: input.corpsHtml,
  });

  if (error) {
    throw new ErreurMetier(`Échec de l'envoi de l'e-mail : ${error.message}`, 502);
  }
}
