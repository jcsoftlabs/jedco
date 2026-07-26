import { NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { obtenirFacture } from "@/lib/services/factures";
import { genererFacturePDF } from "@/lib/pdf";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const facture = await obtenirFacture(id);
  if (!facture) return reponseErreur("Facture introuvable", { status: 404 });

  const pdf = await genererFacturePDF(facture);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.reference}.pdf"`,
    },
  });
});
