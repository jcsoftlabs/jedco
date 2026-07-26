import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerMediaGalerieSchema } from "@/lib/schemas/galerie";
import { listerMediaGalerieAdmin, creerMediaGalerie } from "@/lib/services/galerie";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const media = await listerMediaGalerieAdmin();
  return reponseOk(media);
});

export const POST = routeApi(async (req) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerMediaGalerieSchema.parse(await req.json());
  const media = await creerMediaGalerie(body);

  await consignerAudit({
    userId: user!.id,
    action: "galerie.photo_ajoutee",
    entityType: "Media",
    entityId: media.id,
  });

  return reponseOk(media, { status: 201, message: "Photo ajoutée à la galerie" });
});
