import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierClientSchema } from "@/lib/schemas/clients";
import { obtenirClient, modifierClient, supprimerClient } from "@/lib/services/clients";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const client = await obtenirClient(id);
  if (!client) return reponseErreur("Client introuvable", { status: 404 });

  return reponseOk(client);
});

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierClientSchema.parse(await req.json());
  const client = await modifierClient(id, body);
  if (!client) return reponseErreur("Client introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "client.modifie",
    entityType: "Client",
    entityId: client.id,
  });

  return reponseOk(client, { message: "Client modifié" });
});

export const DELETE = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const client = await supprimerClient(id);
  if (!client) return reponseErreur("Client introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "client.supprime",
    entityType: "Client",
    entityId: client.id,
  });

  return reponseOk(null, { message: "Client supprimé" });
});
