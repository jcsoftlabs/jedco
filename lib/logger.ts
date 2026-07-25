import pino from "pino";

// Logger structuré — jamais de console.log en production (§9 du master
// prompt). Toujours en JSON, y compris en développement : le transport
// pino-pretty spawn un worker thread pour le formatage, qui entre en
// conflit avec le runtime de threads de Next.js dev et fait planter tout
// le process serveur ("the worker has exited") — vérifié empiriquement sur
// ce projet en déclenchant volontairement une erreur de contrainte
// d'exclusion PostgreSQL (§1.3). Le JSON reste lisible dans le terminal.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export function enfant(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}
