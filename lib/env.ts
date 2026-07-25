import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  DIRECT_URL: z.union([z.url(), z.literal("")]).optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET doit faire au moins 32 caractères"),
  ANTHROPIC_API_KEY: z.string().optional(),
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
