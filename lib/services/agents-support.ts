import { prisma } from "@/lib/db";
import { hasherMotDePasse } from "@/lib/auth/password";
import { ErreurMetier } from "@/lib/errors";
import type { CreerAgentSupportInput } from "@/lib/schemas/agents-support";

// Contrairement au technicien (User + fiche Technicien liée), un agent
// support n'a besoin que du compte de connexion — le périmètre SUPPORT est
// déjà limité par requireRole(["ADMIN","SUPPORT"]) sur les routes support,
// pas par une fiche métier séparée.
export async function creerAgentSupport(input: CreerAgentSupportInput) {
  const existant = await prisma.user.findUnique({ where: { email: input.email } });
  if (existant) throw new ErreurMetier("Un utilisateur existe déjà avec cet e-mail", 409);

  const passwordHash = await hasherMotDePasse(input.motDePasse);

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      role: "SUPPORT",
    },
  });
}

export async function listerAgentsSupport() {
  return prisma.user.findMany({
    where: { role: "SUPPORT" },
    orderBy: { createdAt: "desc" },
  });
}

export async function desactiverAgentSupport(id: string) {
  const agent = await prisma.user.findFirst({ where: { id, role: "SUPPORT" } });
  if (!agent) return null;

  return prisma.user.update({ where: { id }, data: { actif: !agent.actif } });
}
