import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierMediaGalerieSchema } from "@/lib/schemas/galerie";
import { modifierMediaGalerie, supprimerMediaGalerie } from "@/lib/services/galerie";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierMediaGalerieSchema.parse(await req.json());
  const media = await modifierMediaGalerie(id, body);
  if (!media) return reponseErreur("Photo introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "galerie.photo_modifiee",
    entityType: "Media",
    entityId: media.id,
  });

  return reponseOk(media, { message: "Photo mise à jour" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const media = await supprimerMediaGalerie(id);
  if (!media) return reponseErreur("Photo introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "galerie.photo_supprimee",
    entityType: "Media",
    entityId: id,
  });

  return reponseOk(null, { message: "Photo supprimée" });
});
