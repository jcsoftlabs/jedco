import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { pointerPresenceSchema, listePresencesSchema } from "@/lib/schemas/presence";
import { pointerPresence, listerPresences } from "@/lib/services/presence";
import { consignerAudit } from "@/lib/audit";

// Réservé à ADMIN/SUPERVISEUR : la synthèse de présence de toute l'équipe,
// pas le pointage individuel (voir POST ci-dessous, et GET /api/presences/moi
// pour ce que le technicien lui-même voit).
export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listePresencesSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { data, meta } = await listerPresences(params);
  return reponseOk(data, { meta });
});

// Un technicien pointe pour lui-même — technicienId vient toujours de sa
// propre session, jamais du corps de la requête, pour qu'il ne puisse pas
// pointer à la place d'un collègue.
export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });
  if (!user.technicien) {
    return reponseErreur("Seul un compte technicien peut pointer sa présence", { status: 403 });
  }

  const body = pointerPresenceSchema.parse(await req.json());
  const presence = await pointerPresence(user.technicien.id, body);

  await consignerAudit({
    userId: user.id,
    action: "presence.pointee",
    entityType: "Presence",
    entityId: presence.id,
    metadata: { present: body.present },
  });

  return reponseOk(presence, { message: body.present ? "Présence enregistrée" : "Absence enregistrée" });
});
