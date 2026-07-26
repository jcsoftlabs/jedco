import { env } from "@/lib/env";

// Domaine définitif pas encore configuré (voir NEXT_PUBLIC_SITE_URL,
// lib/env.ts) — ce repli n'a d'effet que tant que la variable n'est pas
// renseignée en production ; à ce moment-là les URLs canoniques/OpenGraph
// pointeraient à tort vers ce domaine si on l'oubliait.
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL ?? "https://jedco.ht";

export const SITE_NAME = "JEDCO Services S.A.";
export const SITE_DESCRIPTION =
  "JEDCO Services S.A. — Entreprise haïtienne d'assainissement depuis 1994 : vidange de fosses septiques, collecte d'ordures, toilettes mobiles, pest control, nettoyage industriel et contrats municipaux, partout en Haïti.";
