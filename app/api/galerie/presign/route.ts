import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { presignGaleriePhotoSchema } from "@/lib/schemas/galerie";
import { cleMediaGalerie, creerUrlUploadPresignee } from "@/lib/storage/r2";

export const POST = routeApi(async (req) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { nomFichier, contentType } = presignGaleriePhotoSchema.parse(await req.json());
  const cle = cleMediaGalerie(nomFichier);
  const { urlUpload, urlPublique } = await creerUrlUploadPresignee(cle, contentType);

  return reponseOk({ urlUpload, urlPublique });
});
