// app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        {
          error: "EMAIL_REQUIRED",
          message: "メールアドレスが指定されていません。",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { entitlement: true },
    });

    if (!user || !user.entitlement) {
      return NextResponse.json(
        {
          error: "NO_ENTITLEMENT",
          message:
            "このメールアドレスのご利用履歴が見つかりませんでした。",
        },
        { status: 404 }
      );
    }

    const ent = user.entitlement;

    // 月額プラン未加入 or Stripe カスタマーIDなし
    if (ent.plan !== "premium" || !ent.stripeCustomerId) {
      return NextResponse.json(
        {
          error: "NO_SUBSCRIPTION",
          message:
            "現在、このメールアドレスでご利用中の月額プランはありません。",
        },
        { status: 400 }
      );
    }

    const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(
      /\/$/,
      ""
    );

    const session = await stripe.billingPortal.sessions.create({
      customer: ent.stripeCustomerId,
      return_url: `${appUrl}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error", err);
    return NextResponse.json(
      {
        error: "INTERNAL_ERROR",
          // フロントからそのまま alert に使える丁寧メッセージ
        message: "サブスク管理画面の取得に失敗しました。",
      },
      { status: 500 }
    );
  }
}
  