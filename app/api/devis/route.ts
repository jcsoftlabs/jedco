import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeDevisSchema, creerDevisSchema } from "@/lib/schemas/devis";
import { listerDevis, creerDevis } from "@/lib/services/devis";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeDevisSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerDevis(params);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerDevisSchema.parse(await req.json());
  const devis = await creerDevis(body);

  await consignerAudit({
    userId: user!.id,
    action: "devis.cree",
    entityType: "Devis",
    entityId: devis.id,
  });

  return reponseOk(devis, { status: 201, message: "Devis créé" });
});
