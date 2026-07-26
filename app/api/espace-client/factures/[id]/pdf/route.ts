import { NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseErreur } from "@/lib/api/response";
import { clientCourant } from "@/lib/auth/current-client";
import { obtenirFacture } from "@/lib/services/factures";
import { genererFacturePDF } from "@/lib/pdf";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const client = await clientCourant();
  if (!client) return reponseErreur("Non connecté", { status: 401 });

  const { id } = await params;
  const facture = await obtenirFacture(id);
  // 404 plutôt que 403 pour ne pas confirmer l'existence d'une facture qui
  // appartient à un autre client.
  if (!facture || facture.clientId !== client.id) {
    return reponseErreur("Facture introuvable", { status: 404 });
  }

  const pdf = await genererFacturePDF(facture);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${facture.reference}.pdf"`,
    },
  });
});
