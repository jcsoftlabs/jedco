import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierContratSchema } from "@/lib/schemas/contrats";
import { obtenirContrat, modifierContrat, supprimerContrat } from "@/lib/services/contrats";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const contrat = await obtenirContrat(id);
  if (!contrat) return reponseErreur("Contrat introuvable", { status: 404 });

  return reponseOk(contrat);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierContratSchema.parse(await req.json());
  const contrat = await modifierContrat(id, body);
  if (!contrat) return reponseErreur("Contrat introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "contrat.modifie",
    entityType: "Contrat",
    entityId: contrat.id,
  });

  return reponseOk(contrat, { message: "Contrat modifié" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const contrat = await supprimerContrat(id);
  if (!contrat) return reponseErreur("Contrat introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "contrat.resilie",
    entityType: "Contrat",
    entityId: contrat.id,
  });

  return reponseOk(null, { message: "Contrat résilié" });
});
