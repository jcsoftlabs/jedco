import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ZodError, treeifyError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { ErreurAcces } from "@/lib/auth/rbac";
import { ErreurMetier } from "@/lib/errors";
import { reponseErreur } from "@/lib/api/response";
import { logger } from "@/lib/logger";

function idCorrelation(req: NextRequest): string {
  return req.headers.get("x-request-id") ?? randomUUID();
}

type CtxDefaut = { params: Promise<Record<string, never>> };
type Handler<Ctx> = (req: NextRequest, ctx: Ctx & { requestId: string }) => Promise<NextResponse>;

// Enveloppe chaque route API : identifiant de corrélation par requête, log
// structuré, et traduction des erreurs connues (accès refusé, validation,
// conflit d'unicité, chevauchement de planning) vers l'enveloppe de réponse
// uniforme — jamais de stack trace brute renvoyée au client, jamais d'erreur
// avalée en silence.
//
// Générique sur Ctx pour laisser passer le `{ params }` que Next.js 15 fournit
// à CHAQUE route (même statique, avec un params vide) : routeApi<{ params:
// Promise<{ id: string }> }>(...) pour les routes dynamiques ([id]).
export function routeApi<Ctx extends object = CtxDefaut>(handler: Handler<Ctx>) {
  return async (req: NextRequest, ctx: Ctx): Promise<NextResponse> => {
    const requestId = idCorrelation(req);
    const log = logger.child({ requestId, method: req.method, path: req.nextUrl.pathname });

    try {
      const res = await handler(req, { ...ctx, requestId });
      res.headers.set("x-request-id", requestId);
      return res;
    } catch (err) {
      if (err instanceof ErreurAcces) {
        log.warn({ err: err.message }, "accès refusé");
        return reponseErreur(err.message, { status: 403 });
      }
      if (err instanceof ErreurMetier) {
        log.warn({ err: err.message }, "règle métier violée");
        return reponseErreur(err.message, { status: err.status });
      }
      if (err instanceof ZodError) {
        log.warn({ err: treeifyError(err) }, "requête invalide");
        return reponseErreur("Requête invalide", { status: 400, details: treeifyError(err) });
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          log.warn({ err: err.meta }, "conflit d'unicité");
          return reponseErreur("Cette ressource existe déjà", { status: 409 });
        }
        if (err.code === "P2025") {
          log.warn({ err: err.meta }, "ressource introuvable");
          return reponseErreur("Ressource introuvable", { status: 404 });
        }
        // Violation de contrainte d'exclusion PostgreSQL (23P01) — double
        // réservation d'un véhicule ou d'un technicien sur un créneau qui se
        // chevauche (§1.3). Avec Prisma 7 + @prisma/adapter-pg, l'erreur
        // brute Postgres n'apparaît PAS comme err.code (qui vaut "P2039",
        // le code générique Prisma pour une erreur base non traduite) mais
        // nichée dans err.meta.driverAdapterError.cause.code — vérifié
        // empiriquement en déclenchant l'erreur volontairement, car ni la
        // documentation Prisma ni les types publics ne décrivent cette forme.
        const codePostgres = codePostgresDepuisErreurPrisma(err);
        if (codePostgres === "23P01") {
          log.warn({ err: messageErreur(err) }, "chevauchement de planning refusé");
          return reponseErreur("Ce créneau est déjà occupé (véhicule ou technicien indisponible)", {
            status: 409,
          });
        }
      }
      log.error({ err: serialiserErreur(err) }, "erreur non gérée");
      return reponseErreur("Erreur interne", { status: 500 });
    }
  };
}

function codePostgresDepuisErreurPrisma(err: Prisma.PrismaClientKnownRequestError): string | undefined {
  const meta = err.meta as
    | { driverAdapterError?: { cause?: { code?: unknown; originalCode?: unknown } } }
    | undefined;
  const cause = meta?.driverAdapterError?.cause;
  const code = cause?.code ?? cause?.originalCode;
  return typeof code === "string" ? code : undefined;
}

function messageErreur(err: unknown): string {
  return typeof err === "object" && err !== null && "message" in err
    ? String((err as { message?: unknown }).message)
    : String(err);
}

// pino avec le transport pino-pretty a planté tout le process serveur sur un
// objet PrismaClientKnownRequestError (voir lib/logger.ts) — même sans ce
// transport, on ne passe jamais un objet Error brut à pino : on extrait
// explicitement les champs utiles en primitives sérialisables.
function serialiserErreur(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { valeur: String(err) };
}
