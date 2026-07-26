import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { creerTechnicienSchema } from "@/lib/schemas/techniciens";
import { listerTechniciens, creerTechnicien } from "@/lib/services/techniciens";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async () => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const techniciens = await listerTechniciens();
  return reponseOk(techniciens);
});

export const POST = routeApi(async (req) => {
  const user = await utilisateurCourant();
  // Création de compte avec mot de passe — réservée à ADMIN, contrairement à
  // la plupart des autres routes de ce module qui autorisent aussi
  // SUPERVISEUR (§1.6).
  requireRole(user, ["ADMIN"]);

  const body = creerTechnicienSchema.parse(await req.json());
  const technicien = await creerTechnicien(body);

  await consignerAudit({
    userId: user!.id,
    action: "technicien.cree",
    entityType: "Technicien",
    entityId: technicien.id,
  });

  return reponseOk(technicien, { status: 201, message: "Technicien créé" });
});
