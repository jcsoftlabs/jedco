import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierTypeReferenceSchema } from "@/lib/schemas/enums";
import { modifierTypeService, modifierTypeVehicule } from "@/lib/services/types-reference";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ famille: string; code: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { famille, code } = await params;
  if (famille !== "services" && famille !== "vehicules") {
    return reponseErreur("Famille inconnue", { status: 404 });
  }

  const body = modifierTypeReferenceSchema.parse(await req.json());
  const type =
    famille === "services"
      ? await modifierTypeService(code, body)
      : await modifierTypeVehicule(code, body);
  if (!type) return reponseErreur("Type introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "type_reference.modifie",
    entityType: famille === "services" ? "TypeService" : "TypeVehicule",
    entityId: code,
    metadata: body.actif !== undefined ? { actif: body.actif } : undefined,
  });

  return reponseOk(type, { message: "Type mis à jour" });
});
