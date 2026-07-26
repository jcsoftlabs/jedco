import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { convertirDemandeEnClient } from "@/lib/services/demandes-devis";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const resultat = await convertirDemandeEnClient(id);
  if (!resultat) return reponseErreur("Demande introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "demande_devis.convertie_en_client",
    entityType: "DemandeDevis",
    entityId: id,
    metadata: { clientId: resultat.client.id },
  });

  return reponseOk({
    clientId: resultat.client.id,
    clientNom: resultat.client.nom,
    service: resultat.demande.service,
  });
});
