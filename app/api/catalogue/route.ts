import { NextRequest } from "next/server";
import { routeApi } from "@/lib/api/error-handler";
import { reponseOk } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/rbac";
import { utilisateurCourant } from "@/lib/auth/current-user";
import { listeCatalogueSchema, creerArticleCatalogueSchema } from "@/lib/schemas/catalogue";
import { listerCatalogue, creerArticleCatalogue } from "@/lib/services/catalogue";
import { consignerAudit } from "@/lib/audit";

export const GET = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const params = listeCatalogueSchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const articles = await listerCatalogue(params);
  return reponseOk(articles);
});

export const POST = routeApi(async (req: NextRequest) => {
  const user = await utilisateurCourant();
  requireRole(user, ["ADMIN", "SUPERVISEUR"]);

  const body = creerArticleCatalogueSchema.parse(await req.json());
  const article = await creerArticleCatalogue(body);

  await consignerAudit({
    userId: user!.id,
    action: "catalogue.article_cree",
    entityType: "ArticleCatalogue",
    entityId: article.id,
  });

  return reponseOk(article, { status: 201, message: "Article ajouté au catalogue" });
});
