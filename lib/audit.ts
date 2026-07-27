import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { motifsRecherche } from "@/lib/services/recherche";
import type { ListeAuditParams } from "@/lib/schemas/audit";

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

// Le journal était alimenté depuis la Phase 0 mais jamais affiché — un outil
// de traçabilité qu'on ne peut pas consulter ne trace rien en pratique.
// Recherche par requête brute pour la même raison que listerClients
// (lib/services/clients.ts) : unaccent() n'est pas exprimable par le query
// builder Prisma, donc on pré-résout les id concernés puis on filtre
// normalement.
export async function listerJournalAudit(params: ListeAuditParams) {
  const { q, page, limit } = params;

  let idsRecherche: string[] | undefined;
  if (q?.trim()) {
    const motifs = motifsRecherche(q);
    const lignes = await prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM "AuditLog" a
      LEFT JOIN "User" u ON u.id = a."userId"
      WHERE unaccent(lower(
        coalesce(a.action, '') || ' ' || coalesce(a."entityType", '') || ' ' ||
        coalesce(a."entityId", '') || ' ' || coalesce(u.email, '') || ' ' ||
        coalesce(u.prenom, '') || ' ' || coalesce(u.nom, '')
      )) LIKE ALL(${motifs}::text[])
    `;
    idsRecherche = lignes.map((l) => l.id);
  }

  const where: Prisma.AuditLogWhereInput = idsRecherche ? { id: { in: idsRecherche } } : {};

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { nom: true, prenom: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}
