import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierDevisSchema } from "@/lib/schemas/devis";
import { obtenirDevis, modifierDevis, supprimerDevis } from "@/lib/services/devis";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const devis = await obtenirDevis(id);
  if (!devis) return reponseErreur("Devis introuvable", { status: 404 });

  return reponseOk(devis);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierDevisSchema.parse(await req.json());
  const devis = await modifierDevis(id, body);
  if (!devis) return reponseErreur("Devis introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "devis.modifie",
    entityType: "Devis",
    entityId: devis.id,
  });

  return reponseOk(devis, { message: "Devis modifié" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const devis = await supprimerDevis(id);
  if (!devis) return reponseErreur("Devis introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "devis.supprime",
    entityType: "Devis",
    entityId: devis.id,
  });

  return reponseOk(null, { message: "Devis supprimé" });
});
