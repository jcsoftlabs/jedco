import "dotenv/config";
import { prisma } from "@/lib/db";

// Les tests d'intégration tournent contre la vraie base (convention Phase 0,
// faute d'une base de test séparée). Chaque fichier nettoie ce qu'il crée
// dans son afterAll — mais si un hook échoue ou expire, ce nettoyage ne
// s'exécute jamais et des enregistrements « TEST-… » restent visibles dans
// le backoffice, comme cela s'est produit après un dépassement de délai.
//
// Ce script rattrape ces orphelins. À lancer après toute exécution de tests
// qui s'est mal terminée :  npm run db:nettoyer-tests
//
// Ne touche QUE les codes préfixés TEST- et les comptes @jedco.test : aucune
// donnée métier réelle ne correspond à ces motifs.
const PREFIXE_CLIENT = "TEST-";
const SUFFIXE_EMAIL_TEST = "@jedco.test";

async function main() {
  const clients = await prisma.client.findMany({
    where: { code: { startsWith: PREFIXE_CLIENT } },
    select: { id: true, code: true },
  });
  const ids = clients.map((c) => c.id);

  if (ids.length > 0) {
    // Ordre imposé par les clés étrangères : enfants avant parents.
    await prisma.paiement.deleteMany({ where: { facture: { clientId: { in: ids } } } });
    await prisma.ligneFacture.deleteMany({ where: { facture: { clientId: { in: ids } } } });
    await prisma.facture.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.ligneDevis.deleteMany({ where: { devis: { clientId: { in: ids } } } });
    await prisma.devis.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.intervention.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.contrat.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.sessionClient.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.codeConnexionClient.deleteMany({ where: { clientId: { in: ids } } });
    await prisma.client.deleteMany({ where: { id: { in: ids } } });
  }

  const users = await prisma.user.findMany({
    where: { email: { endsWith: SUFFIXE_EMAIL_TEST } },
    select: { id: true, email: true },
  });
  const idsUsers = users.map((u) => u.id);

  if (idsUsers.length > 0) {
    await prisma.conversation.updateMany({ where: { agentId: { in: idsUsers } }, data: { agentId: null } });
    await prisma.technicien.deleteMany({ where: { userId: { in: idsUsers } } });
    await prisma.session.deleteMany({ where: { userId: { in: idsUsers } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: idsUsers } } });
    await prisma.user.deleteMany({ where: { id: { in: idsUsers } } });
  }

  console.log(`Clients de test supprimés : ${clients.length}`);
  if (clients.length) console.log("  " + clients.map((c) => c.code).join("\n  "));
  console.log(`Comptes de test supprimés : ${users.length}`);
  if (users.length) console.log("  " + users.map((u) => u.email).join("\n  "));
  console.log(`\nClients réels restants en base : ${await prisma.client.count()}`);

  await prisma.$disconnect();
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
