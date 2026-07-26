import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeFacturesSchema, creerFactureSchema } from "@/lib/schemas/factures";
import { listerFactures, creerFacture } from "@/lib/services/factures";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeFacturesSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerFactures(params);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerFactureSchema.parse(await req.json());
  const facture = await creerFacture(body);

  await consignerAudit({
    userId: user!.id,
    action: "facture.creee",
    entityType: "Facture",
    entityId: facture.id,
  });

  return reponseOk(facture, { status: 201, message: "Facture créée" });
});
