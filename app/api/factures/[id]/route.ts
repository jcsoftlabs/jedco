import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierFactureSchema } from "@/lib/schemas/factures";
import { obtenirFacture, modifierFacture, supprimerFacture } from "@/lib/services/factures";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const facture = await obtenirFacture(id);
  if (!facture) return reponseErreur("Facture introuvable", { status: 404 });

  return reponseOk(facture);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierFactureSchema.parse(await req.json());
  const facture = await modifierFacture(id, body);
  if (!facture) return reponseErreur("Facture introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "facture.modifiee",
    entityType: "Facture",
    entityId: facture.id,
  });

  return reponseOk(facture, { message: "Facture modifiée" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const facture = await supprimerFacture(id);
  if (!facture) return reponseErreur("Facture introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "facture.annulee",
    entityType: "Facture",
    entityId: facture.id,
  });

  return reponseOk(null, { message: "Facture annulée" });
});
