import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { demarrerLocationSchema } from "@/lib/schemas/toilettes";
import { demarrerLocation, terminerLocation } from "@/lib/services/toilettes";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// Démarre une location — distinct de PUT /api/toilettes/[id], qui refuse
// explicitement le passage direct à LOUEE (voir modifierToilette).
export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = demarrerLocationSchema.parse(await req.json());
  const toilette = await demarrerLocation(id, body);
  if (!toilette) return reponseErreur("Toilette introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "toilette.location-demarree",
    entityType: "ToiletteMobile",
    entityId: id,
    metadata: { clientId: body.clientId },
  });

  return reponseOk(toilette, { message: `Location démarrée pour ${toilette.code}` });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const toilette = await terminerLocation(id);
  if (!toilette) return reponseErreur("Toilette introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "toilette.location-terminee",
    entityType: "ToiletteMobile",
    entityId: id,
  });

  return reponseOk(toilette, { message: "Location terminée, toilette disponible" });
});
