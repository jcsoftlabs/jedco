import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerVehiculeSchema, listeVehiculesSchema } from "@/lib/schemas/vehicules";
import { creerVehicule, listerVehicules } from "@/lib/services/vehicules";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeVehiculesSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const vehicules = await listerVehicules(params);
  return reponseOk(vehicules);
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerVehiculeSchema.parse(await req.json());
  const vehicule = await creerVehicule(body);

  await consignerAudit({
    userId: user!.id,
    action: "vehicule.cree",
    entityType: "Vehicule",
    entityId: vehicule.id,
  });

  return reponseOk(vehicule, { status: 201, message: "Véhicule créé" });
});
