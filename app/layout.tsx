import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ChatProvider } from "./components/ChatContext";
import ChatWidgetGate from "./components/ChatWidgetGate";
import FadeUpObserver from "./components/FadeUpObserver";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "JEDCO Services S.A. — Assainissement Professionnel en Haïti",
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
      </body>
    </html>
  );
}
