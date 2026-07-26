import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Générée dynamiquement (next/og) plutôt qu'un fichier statique — un seul
// endroit à maintenir si le texte change, pas d'asset binaire à repasser à
// chaque mise à jour de la charte.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d3b78",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 4, opacity: 0.7, marginBottom: 12 }}>DEPUIS 1994</div>
        <div style={{ fontSize: 72, fontWeight: 700, textAlign: "center", padding: "0 60px" }}>{SITE_NAME}</div>
        <div style={{ fontSize: 34, opacity: 0.85, marginTop: 24 }}>Assainissement professionnel en Haïti</div>
      </div>
    ),
    { ...size }
  );
}
