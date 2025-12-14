// lib/tarot_ai.ts
import { openai } from "@/lib/openai";
import type { Card, SpreadType } from "@/lib/tarot";

function cardLabel(c: Card) {
  return `${c.name}${c.reversed ? " (reversed)" : " (upright)"}`;
}

export type ReadingTier = "free_short" | "daily_free" | "paid";

export async function generateReading(params: {
  spread: SpreadType;
  cards: Card[];
  positions: string[];
  tier: ReadingTier;
}) {
  const { spread, cards, positions, tier } = params;

  const cardBlock = cards
    .map((c, i) => `${positions[i] ?? `Card ${i + 1}`}: ${cardLabel(c)}`)
    .join("\n");

  const lengthGuide =
    tier === "free_short"
      ? "Very short (1-2 sentences total)."
      : tier === "daily_free"
      ? "Short but helpful (5-8 sentences total)."
      : "Deep and practical (structured, with advice for work/relationships/mindset).";

  const prompt = `
You are a tarot reader.
Explain the following reading in Japanese.

Spread: ${spread}
Cards:
${cardBlock}

Style:
- Warm, grounded, and realistic.
- Avoid medical or legal promises.
- ${lengthGuide}

Output plain text only.
  `.trim();

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await openai.responses.create({
    model,
    input: prompt,
  });

  // 新しいSDKでは output_text が配列で返る
  const anyResp = response as any;
  const text =
    anyResp.output_text ??
    anyResp.output?.[0]?.content?.[0]?.text?.value ??
    "";

  return (
    text || "（AI解釈の取得に失敗しました。しばらくしてからもう一度お試しください）"
  );
}
