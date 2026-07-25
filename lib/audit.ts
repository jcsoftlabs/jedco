import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
};

// Alimente le "feed d'activité récente" du dashboard (Phase 5). Écrit à
// chaque transition significative — connexion, déconnexion, changement de
// statut, paiement — jamais en best-effort silencieux : si l'écriture
// échoue, l'appelant doit le savoir plutôt que perdre la trace.
export async function consignerAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    },
  });
}
