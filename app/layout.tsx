import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ChatProvider } from "./components/ChatContext";
import ChatWidgetGate from "./components/ChatWidgetGate";
import FadeUpObserver from "./components/FadeUpObserver";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Assainissement Professionnel en Haïti`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "assainissement Haïti",
    "vidange fosse septique",
    "collecte d'ordures Haïti",
    "toilettes mobiles",
    "pest control Haïti",
    "nettoyage industriel",
    "JEDCO",
    "Port-au-Prince",
  ],
  authors: [{ name: SITE_NAME }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  // Pas de champ `icons` ici : app/icon.png, app/apple-icon.png et
  // app/favicon.ico (convention App Router) sont détectés automatiquement.
  // Un `icons` explicite dans les métadonnées désactiverait cette détection.
  openGraph: {
    type: "website",
    locale: "fr_HT",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Assainissement Professionnel en Haïti`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Assainissement Professionnel en Haïti`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} bg-white text-slate-800 font-sans antialiased`}>
        <ChatProvider>
          {children}
          <ChatWidgetGate />
        </ChatProvider>
        <FadeUpObserver />
        <Analytics />
      </body>
    </html>
  );
}
