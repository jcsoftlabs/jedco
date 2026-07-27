import { prisma } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import type { ListePresencesParams } from "@/lib/schemas/presence";

// Le modèle Presence existait depuis la Phase 0 (§1.8 : unique(technicienId,
// date) en @db.Date) mais n'était utilisé nulle part — ni pointage, ni page
// de suivi. Ce service est le premier code qui l'utilise.

function dateDuJour(): string {
  return new Date().toISOString().slice(0, 10);
}

// "YYYY-MM-DD" → minuit UTC, pour correspondre exactement à la colonne
// @db.Date de Postgres (qui n'a pas de composante horaire).
function versDateSql(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

// Upsert plutôt que create : un technicien qui pointe deux fois le même jour
// corrige son pointage (ex: coché "absent" par erreur), il n'en crée pas un
// second — c'est justement ce que la contrainte unique(technicienId, date)
// de la Phase 0 empêche.
export async function pointerPresence(
  technicienId: string,
  input: { present: boolean; notes?: string },
  date: string = dateDuJour()
) {
  const dateSql = versDateSql(date);
  return prisma.presence.upsert({
    where: { technicienId_date: { technicienId, date: dateSql } },
    update: { present: input.present, notes: input.notes },
    create: { technicienId, date: dateSql, present: input.present, notes: input.notes },
  });
}

export async function presenceDuJour(technicienId: string, date: string = dateDuJour()) {
  return prisma.presence.findUnique({
    where: { technicienId_date: { technicienId, date: versDateSql(date) } },
  });
}

export async function listerPresences(params: ListePresencesParams) {
  const { page, limit, date, technicienId } = params;
  const where: Prisma.PresenceWhereInput = {
    ...(date ? { date: versDateSql(date) } : {}),
    ...(technicienId ? { technicienId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.presence.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ date: "desc" }],
      include: { technicien: { include: { user: { select: { nom: true, prenom: true } } } } },
    }),
    prisma.presence.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

// Synthèse du jour pour la page de suivi ADMIN/SUPERVISEUR : qui a pointé
// présent, absent, ou n'a pas encore pointé du tout — cette troisième
// catégorie est la plus utile puisqu'un technicien injoignable un matin de
// tournée est justement celui qui n'a pas pointé.
export async function statsPresenceJour(date: string = dateDuJour()) {
  const [techniciensActifs, presences] = await Promise.all([
    prisma.technicien.findMany({
      where: { deletedAt: null },
      select: { id: true, matricule: true, user: { select: { nom: true, prenom: true } } },
      orderBy: { user: { nom: "asc" } },
    }),
    prisma.presence.findMany({ where: { date: versDateSql(date) } }),
  ]);

  const presenceParTechnicien = new Map(presences.map((p) => [p.technicienId, p]));

  const lignes = techniciensActifs.map((t) => ({
    technicienId: t.id,
    matricule: t.matricule,
    nom: t.user.nom,
    prenom: t.user.prenom,
    presence: presenceParTechnicien.get(t.id) ?? null,
  }));

  return {
    date,
    presents: lignes.filter((l) => l.presence?.present === true).length,
    absents: lignes.filter((l) => l.presence?.present === false).length,
    nonPointes: lignes.filter((l) => l.presence === null).length,
    lignes,
  };
}
