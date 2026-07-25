import { NextResponse } from "next/server";
import { serialiserPourJSON } from "@/lib/money";

type Meta = { page?: number; limit?: number; total?: number };

// Enveloppe de réponse uniforme (master prompt §5) : {success, data, message,
// meta} en cas de succès, {success, error, details} en cas d'échec. Toujours
// utiliser ces helpers plutôt que NextResponse.json directement, pour garder
// le format cohérent sur toutes les routes.
export function reponseOk<T>(
  data: T,
  opts?: { message?: string; meta?: Meta; status?: number }
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data: serialiserPourJSON(data),
      message: opts?.message ?? "Opération réussie",
      ...(opts?.meta ? { meta: opts.meta } : {}),
    },
    { status: opts?.status ?? 200 }
  );
}

export function reponseErreur(
  message: string,
  opts?: { status?: number; details?: unknown }
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(opts?.details ? { details: opts.details } : {}),
    },
    { status: opts?.status ?? 400 }
  );
}
