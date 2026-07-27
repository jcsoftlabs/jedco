import { NextRequest, NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { periodeRapportSchema } from "@/lib/schemas/rapports";
import { exporterRapportCsv } from "@/lib/services/rapports";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { dateDebut, dateFin } = periodeRapportSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const csv = await exporterRapportCsv({ dateDebut, dateFin });

  await consignerAudit({
    userId: user!.id,
    action: "rapports.exportes",
    entityType: "Rapport",
  });

  const horodatage = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rapport-activite-${horodatage}.csv"`,
    },
  });
});
