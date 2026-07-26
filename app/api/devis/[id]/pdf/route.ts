import { NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { obtenirDevis } from "@/lib/services/devis";
import { genererDevisPDF } from "@/lib/pdf";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const devis = await obtenirDevis(id);
  if (!devis) return reponseErreur("Devis introuvable", { status: 404 });

  const pdf = await genererDevisPDF(devis);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${devis.reference}.pdf"`,
    },
  });
});
