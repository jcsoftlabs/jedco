// Crée le tout premier compte ADMIN. À exécuter manuellement, une seule fois,
// jamais depuis un pipeline de déploiement (§1.20 du plan — le seed ne doit
// jamais tourner automatiquement en production).
//
// Usage :
//   npx tsx scripts/bootstrap-admin.ts <email> <mot-de-passe> <prenom> <nom>

import "dotenv/config";
import { prisma } from "../lib/db";
import { hasherMotDePasse } from "../lib/auth/password";

async function main() {
  const [email, motDePasse, prenom, nom] = process.argv.slice(2);

  if (!email || !motDePasse || !prenom || !nom) {
    console.error("Usage : npx tsx scripts/bootstrap-admin.ts <email> <mot-de-passe> <prenom> <nom>");
    process.exit(1);
  }

  if (motDePasse.length < 12) {
    console.error("Le mot de passe doit faire au moins 12 caractères.");
    process.exit(1);
  }

  const existant = await prisma.user.findUnique({ where: { email } });
  if (existant) {
    console.error(`Un utilisateur existe déjà avec l'email ${email}.`);
    process.exit(1);
  }

  const passwordHash = await hasherMotDePasse(motDePasse);
  const user = await prisma.user.create({
    data: { email, passwordHash, prenom, nom, role: "ADMIN" },
  });

  console.log(`Compte ADMIN créé : ${user.email} (${user.id})`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
