import { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { consignerAudit } from "@/lib/audit";
import { executerTachesQuotidiennes } from "@/lib/services/taches-planifiees";
import { env } from "@/lib/env";

// Le lot parcourt tous les contrats actifs et écrit une facture par contrat
// éligible : le plafond par défaut des fonctions Vercel est trop court dès
// quelques dizaines de contrats, surtout avec la latence vers Railway.
export const maxDuration = 60;
// Aucune mise en cache : une route qui déclenche des écritures ne doit jamais
// être servie depuis un cache, ni pré-rendue au build.
export const dynamic = "force-dynamic";

// Comparaison à durée constante — un `===` sur un secret fuit sa longueur et
// son préfixe par le temps de réponse. La route est publique par nature
// (c'est Vercel qui l'appelle, pas une session), donc elle est exposée aux
// tentatives répétées.
function jetonValide(fourni: string | null, attendu: string): boolean {
  if (!fourni) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// GET — déclenchement programmé par Vercel Cron (voir vercel.json).
export const GET = routeApi(async (req: NextRequest) => {
  if (!env.CRON_SECRET) {
    // Sans secret configuré, on refuse plutôt que d'ouvrir à tout le monde
    // une URL qui émet des factures. Message explicite : ce cas se produit
    // quand la variable a été oubliée au déploiement, et l'exploitant doit
    // comprendre pourquoi le lot ne tourne pas.
    return reponseErreur("CRON_SECRET n'est pas configuré sur ce déploiement", { status: 503 });
  }

  const entete = req.headers.get("authorization");
  const jeton = entete?.startsWith("Bearer ") ? entete.slice(7) : null;
  if (!jetonValide(jeton, env.CRON_SECRET)) {
    return reponseErreur("Non autorisé", { status: 401 });
  }

  const rapport = await executerTachesQuotidiennes("cron");
  return reponseOk(rapport, { message: "Tâches quotidiennes exécutées" });
});

// POST — déclenchement manuel depuis Paramètres. Utile pour rattraper une nuit
// manquée (déploiement en cours au moment du cron) sans attendre 24 h, et pour
// vérifier après installation que le lot fonctionne réellement.
export const POST = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const rapport = await executerTachesQuotidiennes("manuel");

  await consignerAudit({
    userId: user!.id,
    action: "taches.declenchees-manuellement",
    entityType: "Systeme",
  });

  return reponseOk(rapport, { message: "Tâches exécutées" });
});
