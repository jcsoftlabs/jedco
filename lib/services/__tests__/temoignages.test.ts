import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { creerTemoignage, listerTemoignagesPublies, listerTemoignages, modifierTemoignage, supprimerTemoignage } from "../temoignages";
import { creerTemoignagePublicSchema } from "@/lib/schemas/temoignages";

describe("module Temoignages — vitrine publique (intégration réelle)", () => {
  const idsTemoignages: string[] = [];

  afterAll(async () => {
    await prisma.temoignage.deleteMany({ where: { id: { in: idsTemoignages } } });
    await prisma.$disconnect();
  });

  it("crée un témoignage actif par défaut", async () => {
    const t = await creerTemoignage({
      nom: `Test Client ${Date.now()}`,
      type: "Entreprise — Test SA",
      note: 5,
      commentaire: "Excellent service",
      ordre: 0,
    });
    idsTemoignages.push(t.id);

    expect(t.actif).toBe(true);
    expect(t.note).toBe(5);
  });

  it("masque un témoignage sans le supprimer — n'apparaît plus dans les publiés", async () => {
    const t = await creerTemoignage({
      nom: `Test Masque ${Date.now()}`,
      type: "Particulier",
      note: 4,
      commentaire: "Bon service",
      ordre: 0,
    });
    idsTemoignages.push(t.id);

    const masque = await modifierTemoignage(t.id, { actif: false });
    expect(masque?.actif).toBe(false);

    const publies = await listerTemoignagesPublies();
    expect(publies.some((p) => p.id === t.id)).toBe(false);

    const tous = await listerTemoignages();
    expect(tous.some((p) => p.id === t.id)).toBe(true);
  });

  it("modifierTemoignage renvoie null pour un id inexistant", async () => {
    expect(await modifierTemoignage("id-inexistant", { actif: false })).toBeNull();
  });

  it("supprime un témoignage définitivement", async () => {
    const t = await creerTemoignage({
      nom: `Test Suppr ${Date.now()}`,
      type: "ONG",
      note: 3,
      commentaire: "Correct",
      ordre: 0,
    });

    await supprimerTemoignage(t.id);
    const tous = await listerTemoignages();
    expect(tous.some((p) => p.id === t.id)).toBe(false);
  });

  it("supprimerTemoignage renvoie null pour un id inexistant", async () => {
    expect(await supprimerTemoignage("id-inexistant")).toBeNull();
  });

  it("le schéma public n'expose ni `ordre` ni `actif` — pas de modération avant publication", async () => {
    const donnees = creerTemoignagePublicSchema.parse({
      nom: "Visiteur",
      type: "Client particulier",
      note: 5,
      commentaire: "Très satisfait",
      actif: false, // tenter de le passer quand même : doit être ignoré, pas rejeté
      ordre: 999,
    });
    expect(donnees).not.toHaveProperty("actif");
    expect(donnees).not.toHaveProperty("ordre");

    const t = await creerTemoignage({ ...donnees, ordre: 0 });
    idsTemoignages.push(t.id);

    // Actif dès l'insertion (défaut Prisma) : visible immédiatement, aucune
    // étape de modération à franchir.
    expect(t.actif).toBe(true);
    const publies = await listerTemoignagesPublies();
    expect(publies.some((p) => p.id === t.id)).toBe(true);
  });
});
