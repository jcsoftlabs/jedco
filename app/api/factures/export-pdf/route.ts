import { NextRequest, NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { listeFacturesSchema } from "@/lib/schemas/factures";
import { exporterFacturesPDF } from "@/lib/services/factures";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  // Les mêmes paramètres que l'export CSV (recherche, statut, dates) — sans
  // page ni limit, l'export ignore la pagination par construction.
  const { clientId, statut, dateDebut, dateFin, search } = listeFacturesSchema.parse(
    Object.fromEntries(req.nextUrl.searchParams)
  );

  const pdf = await exporterFacturesPDF({ clientId, statut, dateDebut, dateFin, search });

  await consignerAudit({
    userId: user!.id,
    action: "factures.exportees_pdf",
    entityType: "Facture",
    metadata: { statut, search },
  });

  const horodatage = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="factures-${horodatage}.pdf"`,
    },
  });
});
