import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ErreurMetier } from "@/lib/errors";
import { creerArticleCatalogue, modifierArticleCatalogue, listerCatalogue } from "../catalogue";

describe("module Catalogue (intégration réelle)", () => {
  const idsArticles: string[] = [];

  afterAll(async () => {
    await prisma.articleCatalogue.deleteMany({ where: { id: { in: idsArticles } } });
    await prisma.$disconnect();
  });

  it("crée un article avec un prix suggéré converti en centimes", async () => {
    const article = await creerArticleCatalogue({
      nom: `Vidange standard ${Date.now()}`,
      type: "VIDANGE",
      prixSuggereHTG: 15_000,
    });
    idsArticles.push(article.id);

    expect(article.actif).toBe(true);
    expect(article.prixSuggereHTG).toBe(1_500_000n);
  });

  it("permet un prix suggéré absent (tarif purement indicatif au cas par cas)", async () => {
    const article = await creerArticleCatalogue({ nom: `Service sur devis ${Date.now()}` });
    idsArticles.push(article.id);

    expect(article.prixSuggereHTG).toBeNull();
  });

  it("refuse deux articles avec le même nom", async () => {
    const nom = `Nettoyage ${Date.now()}`;
    const premier = await creerArticleCatalogue({ nom });
    idsArticles.push(premier.id);

    await expect(creerArticleCatalogue({ nom })).rejects.toThrow(ErreurMetier);
  });

  it("désactive un article sans le supprimer — il reste listable via actif:false", async () => {
    const article = await creerArticleCatalogue({ nom: `Toilette mobile ${Date.now()}` });
    idsArticles.push(article.id);

    const desactive = await modifierArticleCatalogue(article.id, { actif: false });
    expect(desactive?.actif).toBe(false);

    const actifs = await listerCatalogue({ actif: true });
    expect(actifs.find((a) => a.id === article.id)).toBeUndefined();

    const inactifs = await listerCatalogue({ actif: false });
    expect(inactifs.find((a) => a.id === article.id)).toBeDefined();
  });
});
