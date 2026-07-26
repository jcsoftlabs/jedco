import { prisma } from "@/lib/db";
import { htgToCentimes } from "@/lib/money";
import { ErreurMetier } from "@/lib/errors";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type {
  CreerArticleCatalogueInput,
  ListeCatalogueParams,
  ModifierArticleCatalogueInput,
} from "@/lib/schemas/catalogue";

export async function listerCatalogue(params: ListeCatalogueParams = {}) {
  const where: Prisma.ArticleCatalogueWhereInput = {
    ...(params.actif !== undefined ? { actif: params.actif } : {}),
  };
  return prisma.articleCatalogue.findMany({ where, orderBy: { nom: "asc" } });
}

export async function creerArticleCatalogue(input: CreerArticleCatalogueInput) {
  if (input.type) await verifierTypesService([input.type]);
  const existant = await prisma.articleCatalogue.findUnique({ where: { nom: input.nom } });
  if (existant) throw new ErreurMetier("Un article avec ce nom existe déjà au catalogue", 409);

  return prisma.articleCatalogue.create({
    data: {
      nom: input.nom,
      description: input.description,
      type: input.type,
      prixSuggereHTG: input.prixSuggereHTG !== undefined ? htgToCentimes(input.prixSuggereHTG) : undefined,
    },
  });
}

export async function modifierArticleCatalogue(id: string, input: ModifierArticleCatalogueInput) {
  const article = await prisma.articleCatalogue.findUnique({ where: { id } });
  if (!article) return null;

  return prisma.articleCatalogue.update({
    where: { id },
    data: {
      ...(input.nom !== undefined ? { nom: input.nom } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.prixSuggereHTG !== undefined ? { prixSuggereHTG: htgToCentimes(input.prixSuggereHTG) } : {}),
      ...(input.actif !== undefined ? { actif: input.actif } : {}),
    },
  });
}
