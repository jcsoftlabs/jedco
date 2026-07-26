import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerTemoignageSchema } from "@/lib/schemas/temoignages";
import { listerTemoignages, creerTemoignage } from "@/lib/services/temoignages";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const temoignages = await listerTemoignages();
  return reponseOk(temoignages);
});

export const POST = routeApi(async (req) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerTemoignageSchema.parse(await req.json());
  const temoignage = await creerTemoignage(body);

  await consignerAudit({
    userId: user!.id,
    action: "temoignage.cree",
    entityType: "Temoignage",
    entityId: temoignage.id,
  });

  return reponseOk(temoignage, { status: 201, message: "Témoignage ajouté" });
});
