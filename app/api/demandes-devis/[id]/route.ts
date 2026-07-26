import { z } from "zod";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { marquerDemandeDevisTraitee } from "@/lib/services/demandes-devis";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

const marquerTraiteSchema = z.object({ traite: z.boolean() });

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const { traite } = marquerTraiteSchema.parse(await req.json());
  const demande = await marquerDemandeDevisTraitee(id, traite);
  if (!demande) return reponseErreur("Demande introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: traite ? "demande_devis.traitee" : "demande_devis.rouverte",
    entityType: "DemandeDevis",
    entityId: demande.id,
  });

  return reponseOk(demande, { message: "Demande mise à jour" });
});
