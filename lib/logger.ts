import pino from "pino";

// Logger structuré — jamais de console.log en production (§9 du master
// prompt). En développement, sortie lisible ; en production, JSON brut
// consommable par l'outil d'agrégation de logs (Vercel / Sentry).
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(process.env.NODE_ENV !== "production"
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

export function enfant(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
