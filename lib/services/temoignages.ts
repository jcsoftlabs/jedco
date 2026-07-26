import { prisma } from "@/lib/db";
import type { CreerTemoignageInput, ModifierTemoignageInput } from "@/lib/schemas/temoignages";

export async function listerTemoignagesPublies() {
  return prisma.temoignage.findMany({
    where: { actif: true },
    orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
  });
}

export async function listerTemoignages() {
  return prisma.temoignage.findMany({
    orderBy: [{ ordre: "asc" }, { createdAt: "desc" }],
  });
}

export async function creerTemoignage(input: CreerTemoignageInput) {
  return prisma.temoignage.create({ data: input });
}

export async function modifierTemoignage(id: string, input: ModifierTemoignageInput) {
  const temoignage = await prisma.temoignage.findUnique({ where: { id } });
  if (!temoignage) return null;

  return prisma.temoignage.update({ where: { id }, data: input });
}

export async function supprimerTemoignage(id: string) {
  const temoignage = await prisma.temoignage.findUnique({ where: { id } });
  if (!temoignage) return null;

  await prisma.temoignage.delete({ where: { id } });
  return temoignage;
}
