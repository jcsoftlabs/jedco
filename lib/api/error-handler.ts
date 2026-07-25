import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError, treeifyError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { ErreurAcces } from "@/lib/auth/rbac";
import { reponseErreur } from "@/lib/api/response";
import { logger } from "@/lib/logger";

function idCorrelation(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? randomUUID();
}

type Handler = (req: NextRequest, ctx: { requestId: string }) => Promise<NextResponse>;

// Enveloppe chaque route API : identifiant de corrélation par requête, log
// structuré, et traduction des erreurs connues (accès refusé, validation,
// conflit d'unicité Prisma) vers l'enveloppe de réponse uniforme — jamais de
// stack trace brute renvoyée au client, jamais d'erreur avalée en silence.
export function routeApi(handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = idCorrelation(req);
    const log = logger.child({ requestId, method: req.method, path: req.nextUrl.pathname });

    try {
      const res = await handler(req, { requestId });
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof ErreurAcces) {
        log.warn({ err: err.message }, "accès refusé");
        return reponseErreur(err.message, { status: 403 });
      }
      if (err instanceof ZodError) {
        log.warn({ err: treeifyError(err) }, "requête invalide");
        return reponseErreur("Requête invalide", { status: 400, details: treeifyError(err) });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        log.warn({ err: err.meta }, "conflit d'unicité");
        return reponseErreur("Cette ressource existe déjà", { status: 409 });
      }
      log.error({ err }, "erreur non gérée");
      return reponseErreur("Erreur interne", { status: 500 });
    }
  };
}
