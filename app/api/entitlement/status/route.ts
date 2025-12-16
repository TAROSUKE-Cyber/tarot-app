// app/api/entitlement/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { entitlement: true },
    });

    // Entitlement がまだ無い人向けのデフォルト
    if (!user || !user.entitlement) {
      return NextResponse.json({
        plan: "free",
        planLabel: "無料プラン",
        credits: 0,
        isPremium: false,
        hasCredits: false,
      });
    }

    const ent = user.entitlement;

    const isPremium = ent.plan === "premium";
    const hasCredits = ent.credits > 0;

    // プラン名を日本語に変換（必要に応じて増やしてください）
    const planLabel =
      ent.plan === "premium"
        ? "プレミアムプラン"
        : ent.plan === "free"
        ? "無料プラン"
        : `プラン：${ent.plan}`;

    return NextResponse.json({
      plan: ent.plan,
      planLabel,
      credits: ent.credits,
      isPremium,
      hasCredits,
    });
  } catch (err) {
    console.error("[/api/entitlement/status] error", err);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
