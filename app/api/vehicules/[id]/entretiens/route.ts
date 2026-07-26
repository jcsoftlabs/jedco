import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { enregistrerEntretienSchema } from "@/lib/schemas/vehicules";
import { enregistrerEntretien } from "@/lib/services/vehicules";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = enregistrerEntretienSchema.parse(await req.json());
  const entretien = await enregistrerEntretien(id, body, user!.id);
  if (!entretien) return reponseErreur("Véhicule introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "vehicule.entretien_enregistre",
    entityType: "EntretienVehicule",
    entityId: entretien.id,
    metadata: { vehiculeId: id, type: body.type },
  });

  return reponseOk(entretien, { status: 201, message: "Entretien enregistré" });
});
