import { revalidatePath } from "next/cache";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { creerTemoignagePublicSchema } from "@/lib/schemas/temoignages";
import { creerTemoignage } from "@/lib/services/temoignages";

// Route publique sans authentification, comme /api/public/demandes-devis :
// aucune modération avant publication (choix explicite du lancement) — le
// témoignage est actif dès l'insertion (défaut Prisma) et visible sur la
// page d'accueil dès que le cache est revalidé ci-dessous, sans attendre les
// 60s d'ISR (voir app/page.tsx).
export const POST = routeApi(async (req) => {
  const body = creerTemoignagePublicSchema.parse(await req.json());
  const temoignage = await creerTemoignage({ ...body, ordre: 0 });

  revalidatePath("/");

  return reponseOk({ id: temoignage.id }, { status: 201, message: "Merci pour votre témoignage !" });
});
