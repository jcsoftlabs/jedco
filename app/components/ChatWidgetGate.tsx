"use client";

import { usePathname } from "next/navigation";
import ChatWidget from "./ChatWidget";

// Tiffany est un outil pour les visiteurs de la vitrine — elle n'a rien à
// faire dans le backoffice (/admin) ni dans le portail client
// (/espace-client), tous deux déjà authentifiés et sans rapport avec le
// chat public.
const PREFIXES_EXCLUS = ["/admin", "/espace-client"];

export default function ChatWidgetGate() {
  const pathname = usePathname();
  if (PREFIXES_EXCLUS.some((p) => pathname?.startsWith(p))) return null;
  return <ChatWidget />;
}
