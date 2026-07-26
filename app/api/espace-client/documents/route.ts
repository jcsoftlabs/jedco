import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { clientCourant } from "@/lib/auth/current-client";
import { documentsClient } from "@/lib/services/auth-client";

export const GET = routeApi(async () => {
  const client = await clientCourant();
  if (!client) return reponseErreur("Non connecté", { status: 401 });

  const documents = await documentsClient(client.id);
  return reponseOk(documents);
});
