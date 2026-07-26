import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierTechnicienSchema } from "@/lib/schemas/techniciens";
import { modifierTechnicien } from "@/lib/services/techniciens";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierTechnicienSchema.parse(await req.json());
  const technicien = await modifierTechnicien(id, body);
  if (!technicien) return reponseErreur("Technicien introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "technicien.modifie",
    entityType: "Technicien",
    entityId: technicien.id,
  });

  return reponseOk(technicien, { message: "Technicien modifié" });
});
