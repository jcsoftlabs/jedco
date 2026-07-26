import { z } from "zod";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { obtenirTauxUsd, definirTauxUsd, desactiverTauxUsd } from "@/lib/services/config";
import { consignerAudit } from "@/lib/audit";

const schema = z.object({ valeur: z.number().positive() });

export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  return reponseOk(await obtenirTauxUsd());
});

// Réservé à ADMIN : ce taux s'imprime sur les documents envoyés aux clients et
// se fige définitivement sur chaque facture émise ensuite (§1.11).
export const PUT = routeApi(async (req) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const { valeur } = schema.parse(await req.json());
  const ancien = await obtenirTauxUsd();
  const taux = await definirTauxUsd(valeur);

  await consignerAudit({
    userId: user!.id,
    action: "config.taux_usd_modifie",
    entityType: "Config",
    entityId: "TAUX_USD_HTG",
    metadata: { ancien: ancien.valeur, nouveau: taux.valeur },
  });

  return reponseOk(taux, { message: "Taux de change mis à jour" });
});

export const DELETE = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const ancien = await obtenirTauxUsd();
  await desactiverTauxUsd();

  await consignerAudit({
    userId: user!.id,
    action: "config.taux_usd_desactive",
    entityType: "Config",
    entityId: "TAUX_USD_HTG",
    metadata: { ancien: ancien.valeur },
  });

  return reponseOk(null, { message: "Affichage en USD désactivé" });
});
