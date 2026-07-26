import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Rien d'intéressant à indexer côté backoffice/portail — et un
        // moteur de recherche n'y accéderait de toute façon jamais sans
        // session valide.
        disallow: ["/admin", "/espace-client", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
