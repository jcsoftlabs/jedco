import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { routeApi } from "@/lib/api/error-handler";

// Health check — vérifie la connectivité réelle à la base plutôt que de
// répondre 200 inconditionnellement, pour que la supervision de disponibilité
// (Phase 7) détecte une base injoignable ou un pooler saturé (§3 du plan).
export const GET = routeApi(async (_req: NextRequest) => {
  const debut = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dureeMs = Date.now() - debut;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: { status: "ok", latenceMs: dureeMs },
  });
});
