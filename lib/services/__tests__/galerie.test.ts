import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  creerMediaGalerie,
  listerMediaGaleriePublie,
  listerMediaGalerieAdmin,
  modifierMediaGalerie,
  supprimerMediaGalerie,
} from "../galerie";

describe("module Galerie — vitrine publique (intégration réelle)", () => {
  const idsMedia: string[] = [];

  afterAll(async () => {
    await prisma.media.deleteMany({ where: { id: { in: idsMedia } } });
    await prisma.$disconnect();
  });

  it("publie une photo par défaut à la création", async () => {
    const media = await creerMediaGalerie({
      url: `https://example.com/test-${Date.now()}.jpg`,
      legende: "Vidange en cours",
    });
    idsMedia.push(media.id);

    expect(media.publieGalerie).toBe(true);
    expect(media.interventionId).toBeNull();
  });

  it("liste uniquement les photos publiées côté public", async () => {
    const media = await creerMediaGalerie({ url: `https://example.com/test-${Date.now()}.jpg` });
    idsMedia.push(media.id);

    await modifierMediaGalerie(media.id, { publieGalerie: false });

    const publiees = await listerMediaGaleriePublie();
    expect(publiees.some((m) => m.id === media.id)).toBe(false);

    const tousAdmin = await listerMediaGalerieAdmin();
    expect(tousAdmin.some((m) => m.id === media.id)).toBe(true);
  });

  it("modifierMediaGalerie renvoie null pour un id inexistant", async () => {
    expect(await modifierMediaGalerie("id-inexistant", { publieGalerie: false })).toBeNull();
  });

  it("supprime une photo (même si l'objet R2 sous-jacent n'existe pas réellement)", async () => {
    const media = await creerMediaGalerie({ url: `https://example.com/test-${Date.now()}.jpg` });

    const supprime = await supprimerMediaGalerie(media.id);
    expect(supprime?.id).toBe(media.id);

    const enBase = await prisma.media.findUnique({ where: { id: media.id } });
    expect(enBase).toBeNull();
  });

  it("supprimerMediaGalerie renvoie null pour un id inexistant", async () => {
    expect(await supprimerMediaGalerie("id-inexistant")).toBeNull();
  });
});
