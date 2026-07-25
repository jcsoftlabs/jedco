import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "Tu es l'assistant officiel de JEDCO Services S.A., entreprise haïtienne d'assainissement depuis 1994. Tu parles en français professionnel et chaleureux. Analyse le problème de l'utilisateur puis recommande le service JEDCO le plus adapté parmi: Vidange de fosses septiques, Collecte d'ordures, Toilettes mobiles, Pest Control, Nettoyage industriel, Contrats municipaux. Structure ta réponse en 3 parties: Diagnostic, Service recommandé, Prochaine étape. Mentionne la zone si fournie et propose de contacter JEDCO au 2942-1109 / 2942-1110.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "L'assistant n'est pas configuré (clé API manquante)." }, { status: 500 });
  }

  const { message } = await req.json();
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || "Problème de connexion." }, { status: res.status });
    }

    const reply = Array.isArray(data.content)
      ? data.content
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("\n\n")
      : "";

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Problème de connexion à l'API." }, { status: 502 });
  }
}
