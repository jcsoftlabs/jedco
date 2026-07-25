import { NextRequest } from "next/server";
import { z } from "zod";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { consignerAudit } from "@/lib/audit";

// Route minimale — juste assez pour alimenter le sélecteur de véhicule du
// formulaire de création d'intervention (Phase 1). Le module Flotte complet
// (statuts, entretien, historique) est la Phase 3 du plan.
const schema = z.object({
  immatriculation: z.string().trim().min(1).max(30),
  marque: z.string().trim().min(1).max(100),
  modele: z.string().trim().min(1).max(100),
  type: z.enum(["CAMION_ASPIRATEUR", "CAMION_COLLECTE", "UTILITAIRE"]),
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = schema.parse(await req.json());
  const vehicule = await prisma.vehicule.create({ data: body });

  await consignerAudit({
    userId: user!.id,
    action: "vehicule.cree",
    entityType: "Vehicule",
    entityId: vehicule.id,
  });

  return reponseOk(vehicule, { status: 201, message: "Véhicule créé" });
});
