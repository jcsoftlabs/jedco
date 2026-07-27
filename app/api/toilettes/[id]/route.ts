import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierToiletteSchema } from "@/lib/schemas/toilettes";
import { obtenirToilette, modifierToilette, supprimerToilette } from "@/lib/services/toilettes";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const toilette = await obtenirToilette(id);
  if (!toilette) return reponseErreur("Toilette introuvable", { status: 404 });

  return reponseOk(toilette);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierToiletteSchema.parse(await req.json());
  const toilette = await modifierToilette(id, body);
  if (!toilette) return reponseErreur("Toilette introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "toilette.modifiee",
    entityType: "ToiletteMobile",
    entityId: toilette.id,
    metadata: body.statut ? { nouveauStatut: body.statut } : undefined,
  });

  return reponseOk(toilette, { message: "Toilette mise à jour" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const { id } = await params;
  const toilette = await supprimerToilette(id);
  if (!toilette) return reponseErreur("Toilette introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "toilette.retiree",
    entityType: "ToiletteMobile",
    entityId: id,
  });

  return reponseOk(null, { message: "Toilette retirée" });
});
