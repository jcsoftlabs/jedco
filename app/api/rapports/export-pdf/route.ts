import { NextRequest, NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { requireRole } from "@/lib/auth/rbac";
import { periodeRapportSchema } from "@/lib/schemas/rapports";
import { rapportActivite } from "@/lib/services/rapports";
import { genererRapportActivitePDF } from "@/lib/pdf";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { dateDebut, dateFin } = periodeRapportSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { dimensions, performance, occupation } = await rapportActivite({ dateDebut, dateFin });
  const pdf = await genererRapportActivitePDF(
    { parType: dimensions.parType, parVille: dimensions.parVille, performance, occupation },
    { dateDebut, dateFin }
  );

  await consignerAudit({
    userId: user!.id,
    action: "rapports.exportes_pdf",
    entityType: "Rapport",
  });

  const horodatage = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapport-activite-${horodatage}.pdf"`,
    },
  });
});
