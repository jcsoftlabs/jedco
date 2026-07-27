import { NextRequest, NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listeFacturesSchema } from "@/lib/schemas/factures";
import { exporterFacturesCsv } from "@/lib/services/factures";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  // Les mêmes paramètres que la page Facturation (recherche, statut, dates) —
  // sans page ni limit, l'export ignore la pagination par construction.
  const { clientId, statut, dateDebut, dateFin, search } = listeFacturesSchema.parse(
    Object.fromEntries(req.nextUrl.searchParams)
  );

  const csv = await exporterFacturesCsv({ clientId, statut, dateDebut, dateFin, search });

  await consignerAudit({
    userId: user!.id,
    action: "factures.exportees",
    entityType: "Facture",
    metadata: { statut, search },
  });

  const horodatage = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="factures-${horodatage}.csv"`,
    },
  });
});
