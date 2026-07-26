import { routeApi } from "@/lib/api/error-handler";
import { reponseOk, reponseErreur } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { modifierArticleCatalogueSchema } from "@/lib/schemas/catalogue";
import { modifierArticleCatalogue } from "@/lib/services/catalogue";
import { consignerAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = routeApi<Ctx>(async (req, { params }) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const { id } = await params;
  const body = modifierArticleCatalogueSchema.parse(await req.json());
  const article = await modifierArticleCatalogue(id, body);
  if (!article) return reponseErreur("Article introuvable", { status: 404 });

  await consignerAudit({
    userId: user!.id,
    action: "catalogue.article_modifie",
    entityType: "ArticleCatalogue",
    entityId: article.id,
  });

  return reponseOk(article, { message: "Article modifié" });
});
