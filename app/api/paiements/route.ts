import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { enregistrerPaiementSchema } from "@/lib/schemas/paiements";
import { enregistrerPaiement } from "@/lib/services/paiements";
import { consignerAudit } from "@/lib/audit";

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = enregistrerPaiementSchema.parse(await req.json());
  const { paiement, dejaTraite } = await enregistrerPaiement(body, user!.id);

  if (!dejaTraite) {
    await consignerAudit({
      userId: user!.id,
      action: "paiement.enregistre",
      entityType: "Paiement",
      entityId: paiement.id,
      metadata: { factureId: body.factureId, montantHTG: paiement.montantHTG.toString() },
    });
  }

  return reponseOk(paiement, {
    status: dejaTraite ? 200 : 201,
    message: dejaTraite ? "Paiement déjà enregistré" : "Paiement enregistré",
  });
});
