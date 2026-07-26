import { randomUUID } from "node:crypto";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

// Cloudflare R2 est compatible API S3 — on utilise le SDK AWS S3 pointé sur
// l'endpoint R2. Les fichiers (photos d'intervention, futurs médias galerie)
// sont uploadés directement depuis le navigateur vers R2 via une URL
// présignée : le serveur ne fait jamais transiter l'octet du fichier
// lui-même, seulement l'autorisation d'upload (§1.2, §2 du plan — coût de
// bande passante mobile en Haïti, éviter de doubler le trafic serveur↔navigateur).

const DUREE_PRESIGNE_SECONDES = 5 * 60;

class ConfigurationR2Manquante extends Error {
  constructor(variable: string) {
    super(
      `${variable} n'est pas configurée — le stockage de fichiers R2 est utilisé sans configuration. Voir INFRA_SETUP.md.`
    );
    this.name = "ConfigurationR2Manquante";
  }
}

function variablesRequises() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID) throw new ConfigurationR2Manquante("R2_ACCOUNT_ID");
  if (!R2_ACCESS_KEY_ID) throw new ConfigurationR2Manquante("R2_ACCESS_KEY_ID");
  if (!R2_SECRET_ACCESS_KEY) throw new ConfigurationR2Manquante("R2_SECRET_ACCESS_KEY");
  if (!R2_BUCKET_NAME) throw new ConfigurationR2Manquante("R2_BUCKET_NAME");
  if (!R2_PUBLIC_URL) throw new ConfigurationR2Manquante("R2_PUBLIC_URL");
  return { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL };
}

let client: S3Client | undefined;

function clientR2(): S3Client {
  if (client) return client;
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = variablesRequises();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

const EXTENSIONS_AUTORISEES = new Set(["jpg", "jpeg", "png", "webp", "heic"]);

function extension(nomFichier: string): string {
  const ext = nomFichier.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONS_AUTORISEES.has(ext) ? ext : "jpg";
}

// Chemin namespacé par intervention — évite les collisions entre techniciens
// et permet de lister/supprimer facilement tous les médias d'une intervention.
export function cleMediaIntervention(interventionId: string, nomFichier: string): string {
  return `interventions/${interventionId}/${randomUUID()}.${extension(nomFichier)}`;
}

// Photos de la galerie publique — uploadées directement par un admin, sans
// intervention associée (Media.interventionId reste null pour ces entrées).
export function cleMediaGalerie(nomFichier: string): string {
  return `galerie/${randomUUID()}.${extension(nomFichier)}`;
}

export async function creerUrlUploadPresignee(
  cle: string,
  contentType: string
): Promise<{ urlUpload: string; urlPublique: string }> {
  const { R2_BUCKET_NAME, R2_PUBLIC_URL } = variablesRequises();
  const commande = new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: cle, ContentType: contentType });
  const urlUpload = await getSignedUrl(clientR2(), commande, { expiresIn: DUREE_PRESIGNE_SECONDES });
  return { urlUpload, urlPublique: `${R2_PUBLIC_URL}/${cle}` };
}

export async function supprimerObjet(cle: string): Promise<void> {
  const { R2_BUCKET_NAME } = variablesRequises();
  await clientR2().send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: cle }));
}

// Extrait la clé R2 depuis une URL publique stockée en base (Media.url), pour
// pouvoir supprimer l'objet correspondant.
export function cleDepuisUrl(url: string): string {
  const { R2_PUBLIC_URL } = variablesRequises();
  if (!url.startsWith(R2_PUBLIC_URL)) {
    throw new Error(`URL hors du bucket R2 configuré : ${url}`);
  }
  return url.slice(R2_PUBLIC_URL.length + 1);
}
