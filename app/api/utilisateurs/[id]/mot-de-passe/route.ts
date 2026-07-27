import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { reinitialiserMotDePasseSchema } from "@/lib/schemas/utilisateurs";
import { reinitialiserMotDePasse } from "@/lib/services/utilisateurs";
import { consignerAudit } from "@/lib/audit";

// Réinitialisation d'un mot de passe par un ADMIN, sans connaître l'ancien.
export const POST = routeApi<{ params: Promise<{ id: string }> }>(async (req: NextRequest, ctx) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const { id } = await ctx.params;

  // Un ADMIN qui change SON propre mot de passe doit passer par la page
  // Profil, qui exige l'ancien. Ici, l'ancien n'est pas demandé : autoriser
  // le raccourci ferait d'un poste laissé déverrouillé une prise de contrôle
  // définitive du compte administrateur.
  if (id === user!.id) {
    return reponseErreur("Utilisez la page Profil pour changer votre propre mot de passe", { status: 400 });
  }

  const { nouveau } = reinitialiserMotDePasseSchema.parse(await req.json());
  const cible = await reinitialiserMotDePasse(id, nouveau);

  await consignerAudit({
    userId: user!.id,
    action: "utilisateur.mot-de-passe-reinitialise",
    entityType: "User",
    entityId: id,
    metadata: { email: cible.email },
  });

  return reponseOk(cible, {
    message: `Mot de passe réinitialisé. ${cible.prenom} a été déconnecté de tous ses appareils.`,
  });
});
