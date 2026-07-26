import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierTemoignageSchema } from "@/lib/schemas/temoignages";
import { modifierTemoignage, supprimerTemoignage } from "@/lib/services/temoignages";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierTemoignageSchema.parse(await req.json());
  const temoignage = await modifierTemoignage(id, body);
  if (!temoignage) return reponseErreur("Témoignage introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "temoignage.modifie",
    entityType: "Temoignage",
    entityId: temoignage.id,
  });

  return reponseOk(temoignage, { message: "Témoignage mis à jour" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const temoignage = await supprimerTemoignage(id);
  if (!temoignage) return reponseErreur("Témoignage introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "temoignage.supprime",
    entityType: "Temoignage",
    entityId: id,
  });

  return reponseOk(null, { message: "Témoignage supprimé" });
});
