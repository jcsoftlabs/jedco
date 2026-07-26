import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Une seule page publique indexable aujourd'hui (site vitrine mono-page,
// ancres internes) — /admin et /espace-client sont exclus (voir robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
