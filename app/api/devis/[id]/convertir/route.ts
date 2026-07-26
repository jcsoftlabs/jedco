import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { convertirDevisEnFacture } from "@/lib/services/devis";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const facture = await convertirDevisEnFacture(id);
  if (!facture) return reponseErreur("Devis introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "devis.converti_en_facture",
    entityType: "Devis",
    entityId: id,
  });

  return reponseOk(facture, { status: 201, message: "Devis converti en facture" });
});
