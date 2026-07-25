import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { presignPhotoSchema } from "@/lib/schemas/interventions";
import { obtenirIntervention } from "@/lib/services/interventions";
import { cleMediaIntervention, creerUrlUploadPresignee } from "@/lib/storage/r2";

type Ctx = { params: Promise<{ id: string }> };

// Étape 1 du flux photo : le serveur n'uploade jamais le fichier lui-même —
// il vérifie juste que l'intervention existe et est accessible à cet
// utilisateur, puis renvoie une URL présignée que le navigateur utilise pour
// uploader DIRECTEMENT vers R2 (§1.2, §2 du plan — coût de bande passante
// mobile en Haïti). L'URL publique résultante est ensuite soumise via
// POST /rapport dans le tableau `photos`.
export const POST = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  if (!user) return reponseErreur("Non authentifié", { status: 401 });

  const { id } = await params;
  const intervention = await obtenirIntervention(id, user);
  if (!intervention) return reponseErreur("Intervention introuvable", { status: 404 });

  const { nomFichier, contentType } = presignPhotoSchema.parse(await req.json());
  const cle = cleMediaIntervention(id, nomFichier);
  const { urlUpload, urlPublique } = await creerUrlUploadPresignee(cle, contentType);

  return reponseOk({ urlUpload, urlPublique });
});
