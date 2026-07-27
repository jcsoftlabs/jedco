import { prisma } from "@/lib/db";
import { codeToilette } from "@/lib/codes";
import { ErreurMetier } from "@/lib/errors";
import type { Prisma } from "@/app/generated/prisma/client";
import type {
  CreerToiletteInput,
  ModifierToiletteInput,
  DemarrerLocationInput,
  ListeToilettesParams,
} from "@/lib/schemas/toilettes";

// Le modèle ToiletteMobile existait dans le schéma depuis la Phase 0 —
// location de toilettes mobiles, une ligne de revenu réelle pour une
// entreprise d'assainissement — mais sans service, sans route, sans page :
// une fonctionnalité que le schéma promettait sans que le code la tienne.
//
// Le modèle ne porte que l'état COURANT d'une location (client, dates), pas
// un historique ligne par ligne comme Facture/LigneFacture : suffisant pour
// savoir "qui loue quoi en ce moment", pas pour un relevé complet des
// locations passées. À étendre avec une table d'historique si JEDCO en a
// besoin plus tard.

const INCLUDE_CLIENT = { client: { select: { nom: true, telephone: true } } } satisfies Prisma.ToiletteMobileInclude;

export async function listerToilettes(params: ListeToilettesParams) {
  const { page, limit, statut } = params;
  const where: Prisma.ToiletteMobileWhereInput = {
    deletedAt: null,
    ...(statut ? { statut } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.toiletteMobile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { code: "asc" },
      include: INCLUDE_CLIENT,
    }),
    prisma.toiletteMobile.count({ where }),
  ]);

  return { data, meta: { page, limit, total } };
}

export async function obtenirToilette(id: string) {
  return prisma.toiletteMobile.findFirst({ where: { id, deletedAt: null }, include: INCLUDE_CLIENT });
}

export async function creerToilette(input: CreerToiletteInput) {
  const code = await codeToilette();
  return prisma.toiletteMobile.create({ data: { code, statut: "DISPONIBLE", ...input } });
}

export async function modifierToilette(id: string, input: ModifierToiletteInput) {
  const toilette = await prisma.toiletteMobile.findFirst({ where: { id, deletedAt: null } });
  if (!toilette) return null;

  // Passer directement à LOUEE ici contournerait démarrerLocation — la
  // toilette se retrouverait "louée" sans client ni dates, un état
  // incohérent qu'aucune des deux routes ne saurait ensuite corriger
  // proprement. Un statut EN_MAINTENANCE en revanche est un simple aller,
  // légitime depuis n'importe quel autre statut.
  if (input.statut === "LOUEE") {
    throw new ErreurMetier("Utilisez « Démarrer une location » pour passer une toilette en LOUEE", 400);
  }
  if (toilette.statut === "LOUEE" && input.statut === "DISPONIBLE") {
    throw new ErreurMetier("Utilisez « Terminer la location » pour libérer une toilette louée", 400);
  }

  return prisma.toiletteMobile.update({ where: { id }, data: input, include: INCLUDE_CLIENT });
}

export async function demarrerLocation(id: string, input: DemarrerLocationInput) {
  const toilette = await prisma.toiletteMobile.findFirst({ where: { id, deletedAt: null } });
  if (!toilette) return null;

  if (toilette.statut !== "DISPONIBLE") {
    throw new ErreurMetier(`Cette toilette n'est pas disponible (statut actuel : ${toilette.statut})`, 409);
  }

  const client = await prisma.client.findFirst({ where: { id: input.clientId, deletedAt: null } });
  if (!client) throw new ErreurMetier("Client introuvable", 404);

  return prisma.toiletteMobile.update({
    where: { id },
    data: {
      statut: "LOUEE",
      clientId: input.clientId,
      dateDebutLocation: input.dateDebutLocation,
      dateFinLocation: input.dateFinLocation,
      localisationActuelle: input.localisationActuelle ?? toilette.localisationActuelle,
    },
    include: INCLUDE_CLIENT,
  });
}

// Libère la toilette pour une prochaine location — les dates et le client de
// la location qui vient de se terminer ne sont pas conservés ici (voir la
// note en tête de fichier sur l'absence d'historique).
export async function terminerLocation(id: string) {
  const toilette = await prisma.toiletteMobile.findFirst({ where: { id, deletedAt: null } });
  if (!toilette) return null;

  if (toilette.statut !== "LOUEE") {
    throw new ErreurMetier("Cette toilette n'est pas en cours de location", 400);
  }

  return prisma.toiletteMobile.update({
    where: { id },
    data: { statut: "DISPONIBLE", clientId: null, dateDebutLocation: null, dateFinLocation: null },
  });
}

export async function supprimerToilette(id: string) {
  const toilette = await prisma.toiletteMobile.findFirst({ where: { id, deletedAt: null } });
  if (!toilette) return null;

  if (toilette.statut === "LOUEE") {
    throw new ErreurMetier("Impossible de retirer une toilette actuellement louée", 409);
  }

  return prisma.toiletteMobile.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function statsToilettes() {
  const parStatutBrut = await prisma.toiletteMobile.groupBy({
    by: ["statut"],
    where: { deletedAt: null },
    _count: true,
  });
  const parStatut = Object.fromEntries(parStatutBrut.map((l) => [l.statut, l._count]));

  return {
    total: Object.values(parStatut).reduce((s, n) => s + n, 0),
    disponibles: parStatut.DISPONIBLE ?? 0,
    louees: parStatut.LOUEE ?? 0,
    enMaintenance: parStatut.EN_MAINTENANCE ?? 0,
  };
}
