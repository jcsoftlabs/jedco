import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listeToilettesSchema, creerToiletteSchema } from "@/lib/schemas/toilettes";
import { listerToilettes, creerToilette } from "@/lib/services/toilettes";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeToilettesSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerToilettes(params);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerToiletteSchema.parse(await req.json());
  const toilette = await creerToilette(body);

  await consignerAudit({
    userId: user!.id,
    action: "toilette.creee",
    entityType: "ToiletteMobile",
    entityId: toilette.id,
  });

  return reponseOk(toilette, { status: 201, message: `Toilette ${toilette.code} ajoutée` });
});
