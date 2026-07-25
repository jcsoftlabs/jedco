import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeContratsSchema, creerContratSchema } from "@/lib/schemas/contrats";
import { listerContrats, creerContrat } from "@/lib/services/contrats";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeContratsSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerContrats(params);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerContratSchema.parse(await req.json());
  const contrat = await creerContrat(body);

  await consignerAudit({
    userId: user!.id,
    action: "contrat.cree",
    entityType: "Contrat",
    entityId: contrat.id,
  });

  return reponseOk(contrat, { status: 201, message: "Contrat créé" });
});
