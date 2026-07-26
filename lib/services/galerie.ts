import { prisma } from "@/lib/db";
import { supprimerObjet, cleDepuisUrl } from "@/lib/storage/r2";
import type { CreerMediaGalerieInput, ModifierMediaGalerieInput } from "@/lib/schemas/galerie";

// Utilisée par la page publique — uniquement les photos explicitement
// publiées par un admin, jamais les photos brutes de rapport d'intervention
// (elles peuvent montrer une adresse client ou un incident en cours).
export async function listerMediaGaleriePublie() {
  return prisma.media.findMany({
    where: { publieGalerie: true },
    orderBy: { createdAt: "desc" },
  });
}

// Utilisée par /admin/galerie — toutes les photos, publiées ou non, pour que
// l'admin puisse choisir lesquelles publier.
export async function listerMediaGalerieAdmin() {
  return prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function creerMediaGalerie(input: CreerMediaGalerieInput) {
  return prisma.media.create({
    data: {
      url: input.url,
      legende: input.legende,
      type: input.type,
      publieGalerie: true,
    },
  });
}

export async function modifierMediaGalerie(id: string, input: ModifierMediaGalerieInput) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return null;

  return prisma.media.update({ where: { id }, data: input });
}

// Supprime à la fois l'enregistrement et l'objet R2 sous-jacent — laisser
// l'objet orphelin en stockage n'a aucun intérêt et coûte indéfiniment.
export async function supprimerMediaGalerie(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return null;

  await prisma.media.delete({ where: { id } });
  try {
    await supprimerObjet(cleDepuisUrl(media.url));
  } catch {
    // Le média est déjà retiré de la galerie et de la base — un échec de
    // suppression côté R2 (permissions, réseau) ne doit pas faire échouer
    // l'opération pour l'admin, juste laisser un objet orphelin à nettoyer
    // manuellement plus tard.
  }

  return media;
}
