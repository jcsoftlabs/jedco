import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.union([z.url(), z.literal("")]).optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Cloudflare R2 (stockage des photos d'intervention — §1.2 du plan).
  // Optionnelles au démarrage : seules les routes qui uploadent réellement un
  // fichier en ont besoin ; lib/storage/r2.ts échoue explicitement à l'usage
  // si elles manquent, plutôt que de bloquer tout le serveur pour une
  // fonctionnalité que la requête courante n'utilise pas.
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.union([z.url(), z.literal("")]).optional(),
});

// Validé une seule fois au premier import — importer ce module tôt (ex. dans
// instrumentation.ts) fait échouer le démarrage plutôt qu'une requête en
// production quand une variable manque ou est mal formée.
const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variables d'environnement invalides :\n${details}`);
}

export const env = parsed.data;
