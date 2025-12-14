// lib/tarot.ts
export type SpreadType = "one" | "three";

export type Card = {
  name: string;
  reversed: boolean;
};

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress",
  "The Emperor", "The Hierophant", "The Lovers", "The Chariot",
  "Strength", "The Hermit", "Wheel of Fortune", "Justice",
  "The Hanged Man", "Death", "Temperance", "The Devil",
  "The Tower", "The Star", "The Moon", "The Sun",
  "Judgement", "The World",
];

export function drawCard(): Card {
  const name = MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)];
  const reversed = Math.random() < 0.5;
  return { name, reversed };
}

export function drawSpread(spread: SpreadType) {
  if (spread === "one") {
    return {
      spread,
      cards: [drawCard()],
      positions: ["今日のメッセージ"],
    };
  }

  // three: 過去・現在・未来
  return {
    spread,
    cards: [drawCard(), drawCard(), drawCard()],
    positions: ["過去", "現在", "未来"],
  };
}

// lib/tarot.ts の一番下あたりに追加

import type { Card } from "./tarot"; // もし同じファイル内なら不要

export function getCardImagePath(card: Card): string {
  // カード名をスラッグ化してファイル名にする
  const slug = card.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // 英数字以外をハイフンに
    .replace(/(^-|-$)/g, "");    // 先頭末尾のハイフンを削除

  // 例: "The Sun" → "the-sun"
  return `/tarot/${slug}.png`;
}

