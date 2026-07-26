import { prisma } from "@/lib/db";
import { matriculeTechnicien } from "@/lib/codes";
import { hasherMotDePasse } from "@/lib/auth/password";
import { ErreurMetier } from "@/lib/errors";
import { verifierTypesService } from "@/lib/services/types-reference";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreerTechnicienInput, ModifierTechnicienInput } from "@/lib/schemas/techniciens";

const INCLUDE_STANDARD = { user: true } satisfies Prisma.TechnicienInclude;

export async function listerTechniciens() {
  return prisma.technicien.findMany({
    where: { deletedAt: null },
    include: INCLUDE_STANDARD,
    orderBy: { createdAt: "desc" },
  });
}

// Crée à la fois le compte de connexion (User, role TECHNICIEN) et la fiche
// métier (Technicien, matricule auto-généré via séquence PostgreSQL — §1.4)
// dans une même transaction : un compte sans fiche technicien ne verrait
// aucune intervention (scopeInterventions renvoie __aucun__, voir
// lib/auth/rbac.ts), une fiche sans compte ne pourrait jamais se connecter.
export async function creerTechnicien(input: CreerTechnicienInput) {
  await verifierTypesService(input.specialites);
  const existant = await prisma.user.findUnique({ where: { email: input.email } });
  if (existant) throw new ErreurMetier("Un utilisateur existe déjà avec cet e-mail", 409);

  const passwordHash = await hasherMotDePasse(input.motDePasse);
  const matricule = await matriculeTechnicien();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        prenom: input.prenom,
        nom: input.nom,
        telephone: input.telephone,
        role: "TECHNICIEN",
      },
    });

    return tx.technicien.create({
      data: {
        userId: user.id,
        matricule,
        specialites: input.specialites,
        zonesAssignees: input.zonesAssignees,
      },
      include: INCLUDE_STANDARD,
    });
  });
}

export async function modifierTechnicien(id: string, input: ModifierTechnicienInput) {
  if (input.specialites) await verifierTypesService(input.specialites);
  const technicien = await prisma.technicien.findFirst({ where: { id, deletedAt: null } });
  if (!technicien) return null;

  return prisma.technicien.update({ where: { id }, data: input, include: INCLUDE_STANDARD });
}
