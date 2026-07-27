import { prisma } from "@/lib/db";
import { hasherMotDePasse, verifierMotDePasse } from "@/lib/auth/password";
import { revoquerToutesLesSessions } from "@/lib/auth/session";
import { ErreurMetier } from "@/lib/errors";

// Jusqu'ici, un mot de passe se fixait à la création du compte et ne changeait
// plus jamais : ni page de changement, ni « mot de passe oublié », ni
// réinitialisation par l'administrateur. Un employé qui oubliait le sien — ou
// qui quittait l'entreprise en connaissant celui d'un collègue — n'avait
// aucune issue interne. C'est ce que ce module corrige.
//
// Il n'y a volontairement PAS de réinitialisation par e-mail : l'envoi
// (Resend) n'est pas encore actif sur ce déploiement, et un parcours de
// récupération qui dépend d'un canal muet est pire qu'absent. La voie de
// secours est la réinitialisation par un ADMIN, qui communique le nouveau mot
// de passe de vive voix. À reconsidérer le jour où le domaine d'envoi est
// vérifié.

// Ce que l'on expose d'un compte — jamais passwordHash, y compris vers un
// ADMIN : rien dans le backoffice n'a de raison de le lire.
const CHAMPS_PUBLICS = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  telephone: true,
  role: true,
  actif: true,
  createdAt: true,
} as const;

export async function listerUtilisateurs() {
  return prisma.user.findMany({
    select: CHAMPS_PUBLICS,
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });
}

// Changement volontaire par l'intéressé. Le mot de passe actuel est exigé même
// si la session est déjà valide : sinon, un poste laissé déverrouillé
// suffirait à confisquer le compte de son titulaire.
export async function changerSonMotDePasse(
  userId: string,
  actuel: string,
  nouveau: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ErreurMetier("Compte introuvable", 404);

  if (!(await verifierMotDePasse(user.passwordHash, actuel))) {
    throw new ErreurMetier("Mot de passe actuel incorrect", 400);
  }
  if (await verifierMotDePasse(user.passwordHash, nouveau)) {
    throw new ErreurMetier("Le nouveau mot de passe doit être différent de l'actuel", 400);
  }

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hasherMotDePasse(nouveau) } });

  // Un changement de mot de passe doit déconnecter partout — c'est le geste
  // que fait quelqu'un qui pense que son mot de passe a fuité. Les sessions
  // étant révocables en base (§1.6), la révocation est réelle et immédiate,
  // y compris sur un appareil qu'on n'a plus sous la main. L'appelant
  // rouvre ensuite une session pour l'appareil courant.
  await revoquerToutesLesSessions(userId);
}

// Réinitialisation par un ADMIN, sans connaître l'ancien mot de passe : la
// seule voie de secours quand un employé a oublié le sien.
export async function reinitialiserMotDePasse(cibleId: string, nouveau: string) {
  const cible = await prisma.user.findUnique({ where: { id: cibleId }, select: CHAMPS_PUBLICS });
  if (!cible) throw new ErreurMetier("Compte introuvable", 404);

  await prisma.user.update({ where: { id: cibleId }, data: { passwordHash: await hasherMotDePasse(nouveau) } });
  await revoquerToutesLesSessions(cibleId);

  return cible;
}

// Désactivation d'un compte : `actif: false` est déjà vérifié à la connexion
// et par validerSession, donc un compte désactivé perd l'accès immédiatement.
// Préféré à la suppression, qui casserait les références du journal d'audit et
// des conversations prises en charge.
export async function definirActivationCompte(cibleId: string, actif: boolean) {
  const cible = await prisma.user.findUnique({ where: { id: cibleId }, select: CHAMPS_PUBLICS });
  if (!cible) throw new ErreurMetier("Compte introuvable", 404);

  const misAJour = await prisma.user.update({
    where: { id: cibleId },
    data: { actif },
    select: CHAMPS_PUBLICS,
  });
  if (!actif) await revoquerToutesLesSessions(cibleId);

  return misAJour;
}
