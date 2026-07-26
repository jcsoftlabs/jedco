import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierVehiculeSchema } from "@/lib/schemas/vehicules";
import { obtenirVehicule, modifierVehicule, supprimerVehicule } from "@/lib/services/vehicules";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const vehicule = await obtenirVehicule(id);
  if (!vehicule) return reponseErreur("Véhicule introuvable", { status: 404 });

  return reponseOk(vehicule);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierVehiculeSchema.parse(await req.json());
  const vehicule = await modifierVehicule(id, body);
  if (!vehicule) return reponseErreur("Véhicule introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "vehicule.modifie",
    entityType: "Vehicule",
    entityId: vehicule.id,
    metadata: body.statut ? { nouveauStatut: body.statut } : undefined,
  });

  return reponseOk(vehicule, { message: "Véhicule mis à jour" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN"]);

  const { id } = await params;
  const vehicule = await supprimerVehicule(id);
  if (!vehicule) return reponseErreur("Véhicule introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "vehicule.retire",
    entityType: "Vehicule",
    entityId: id,
  });

  return reponseOk(null, { message: "Véhicule retiré de la flotte" });
});
