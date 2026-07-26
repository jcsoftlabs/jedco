import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerTypeReferenceSchema } from "@/lib/schemas/enums";
import {
  listerTypesService,
  listerTypesVehicule,
  creerTypeService,
  creerTypeVehicule,
} from "@/lib/services/types-reference";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ famille: string }> };

// Une seule route pour les deux familles ("services" | "vehicules") : elles
// ont exactement la même forme et le même cycle de vie. Un segment inconnu
// renvoie 404 plutôt que d'être traité comme l'une des deux.
function estFamilleValide(f: string): f is "services" | "vehicules" {
  return f === "services" || f === "vehicules";
}

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { famille } = await params;
  if (!estFamilleValide(famille)) return reponseErreur("Famille inconnue", { status: 404 });

  const types = famille === "services" ? await listerTypesService() : await listerTypesVehicule();
  return reponseOk(types);
});

export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { famille } = await params;
  if (!estFamilleValide(famille)) return reponseErreur("Famille inconnue", { status: 404 });

  const body = creerTypeReferenceSchema.parse(await req.json());
  const type = famille === "services" ? await creerTypeService(body) : await creerTypeVehicule(body);

  await consignerAudit({
    userId: user!.id,
    action: "type_reference.cree",
    entityType: famille === "services" ? "TypeService" : "TypeVehicule",
    entityId: type.code,
  });

  return reponseOk(type, { status: 201, message: "Type ajouté" });
});
