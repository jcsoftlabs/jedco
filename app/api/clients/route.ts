import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeClientsSchema, creerClientSchema } from "@/lib/schemas/clients";
import { listerClients, creerClient } from "@/lib/services/clients";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeClientsSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerClients(params);
  return reponseOk(data, { meta });
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerClientSchema.parse(await req.json());
  const client = await creerClient(body);

  await consignerAudit({
    userId: user!.id,
    action: "client.cree",
    entityType: "Client",
    entityId: client.id,
  });

  return reponseOk(client, { status: 201, message: "Client créé" });
});
