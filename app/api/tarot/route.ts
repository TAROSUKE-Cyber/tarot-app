// app/api/tarot/route.ts

export const runtime = "nodejs";        // OpenAI / Prisma を使うので Node ランタイム
export const dynamic = "force-dynamic"; // ビルド時に静的プリレンダしない

import { NextRequest, NextResponse } from "next/server";
import {
  getEntitlement,
  consumeOneCredit,
  canUseDailyFree,
  markDailyFreeUsed,
  logReading,
} from "@/lib/entitlements";
import { drawSpread, SpreadType } from "@/lib/tarot";
import { generateReading } from "@/lib/tarot_ai";

export async function POST(req: NextRequest) {
  try {
    // リクエストボディ取得
    const body = (await req.json()) as {
      email?: string;
      spread?: SpreadType;
    };

    const email = body?.email;
    const spread = body?.spread;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const spreadType: SpreadType = spread ?? "one";

    const ent = await getEntitlement(email);
    const drawn = drawSpread(spreadType);

    // まず「無料の短文」
    const freeShort = await generateReading({
      spread: drawn.spread,
      cards: drawn.cards,
      positions: drawn.positions,
      tier: "free_short",
    });

    // プレミアムなら無制限で深掘り
    if (ent.plan === "premium") {
      const text = await generateReading({
        spread: drawn.spread,
        cards: drawn.cards,
        positions: drawn.positions,
        tier: "paid",
      });

      await logReading(email, "premium", spreadType);

      return NextResponse.json({
        ...drawn,
        tier: "premium",
        plan: ent.plan,
        creditsLeft: ent.credits,
        text,
      });
    }

    // クレジット消費できるか？
    const can = await consumeOneCredit(email);

    if (can.ok) {
      const text = await generateReading({
        spread: drawn.spread,
        cards: drawn.cards,
        positions: drawn.positions,
        tier: "paid",
      });

      await logReading(email, "credit", spreadType);
      const entAfter = await getEntitlement(email);

      return NextResponse.json({
        ...drawn,
        tier: "credit",
        plan: entAfter.plan,
        creditsLeft: entAfter.credits,
        text,
      });
    }

    // 1日1回だけ無料の深掘りライト
    const dailyOk = await canUseDailyFree(email);

    if (dailyOk) {
      const text = await generateReading({
        spread: drawn.spread,
        cards: drawn.cards,
        positions: drawn.positions,
        tier: "daily_free",
      });

      await markDailyFreeUsed(email, spreadType);

      return NextResponse.json({
        ...drawn,
        tier: "daily_free",
        plan: ent.plan,
        creditsLeft: ent.credits,
        text,
        message: "本日の無料深掘りを使用しました。",
      });
    }

    // それ以外は「無料の短文のみ」
    await logReading(email, "free_short", spreadType);

    return NextResponse.json({
      ...drawn,
      tier: "free",
      plan: ent.plan,
      creditsLeft: ent.credits,
      text: freeShort,
      message: "深掘りはチケット購入または月額で解放されます。",
    });
  } catch (err) {
    // ここで握りつぶして 500 を返すので、ビルド時に落ちにくくなる
    console.error("[/api/tarot] route error", err);
    return NextResponse.json(
      { error: "Internal tarot API error" },
      { status: 500 }
    );
  }
}
