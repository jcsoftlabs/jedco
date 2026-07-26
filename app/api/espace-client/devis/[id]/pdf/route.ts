import { NextResponse } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseErreur } from "@/lib/api/response";
import { clientCourant } from "@/lib/auth/current-client";
import { obtenirDevis } from "@/lib/services/devis";
import { genererDevisPDF } from "@/lib/pdf";

type Ctx = { params: Promise<{ id: string }> };

export const GET = routeApi<Ctx>(async (_req, { params }) => {
  const client = await clientCourant();
  if (!client) return reponseErreur("Non connecté", { status: 401 });

  const { id } = await params;
  const devis = await obtenirDevis(id);
  if (!devis || devis.clientId !== client.id) {
    return reponseErreur("Devis introuvable", { status: 404 });
  }

  const pdf = await genererDevisPDF(devis);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${devis.reference}.pdf"`,
    },
  });
});
