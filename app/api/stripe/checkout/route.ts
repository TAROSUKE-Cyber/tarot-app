// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import "@/lib/entitlements"; // side-effectでprisma初期化用に読み込むだけでもOK

// Stripe の Node SDK を使う宣言＆ビルド時に静的プリレンダしない
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PurchaseType = "single" | "ticket10" | "subMonthly";

const PRICES = {
  single: process.env.STRIPE_PRICE_SINGLE_READING!,
  ticket10: process.env.STRIPE_PRICE_TICKET_10!,
  subMonthly: process.env.STRIPE_PRICE_SUB_MONTHLY!,
} as const;

function purchaseToMode(type: PurchaseType) {
  return type === "subMonthly" ? "subscription" : "payment";
}

export async function POST(req: NextRequest) {
  try {
    const { email, type } = (await req.json()) as {
      email: string;
      type: PurchaseType;
    };

    // 入力チェック
    if (!email || !type) {
      return NextResponse.json(
        { error: "email and type are required" },
        { status: 400 }
      );
    }

    // type が想定外の文字列だった場合のガード
    if (!["single", "ticket10", "subMonthly"].includes(type)) {
      return NextResponse.json(
        { error: `invalid purchase type: ${type}` },
        { status: 400 }
      );
    }

    const priceId = PRICES[type];
    if (!priceId) {
      console.error("Stripe price ID is missing for type:", type);
      return NextResponse.json(
        { error: "Stripe price configuration is missing" },
        { status: 500 }
      );
    }

    if (!process.env.APP_URL) {
      console.error("APP_URL is not set in environment variables");
      return NextResponse.json(
        { error: "Server configuration error (APP_URL not set)" },
        { status: 500 }
      );
    }

    // ユーザー＆entitlement を upsert
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, entitlement: { create: {} } },
      include: { entitlement: true },
    });

    const mode = purchaseToMode(type);

    // Stripe Checkout セッション作成
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/pricing?success=1`,
      cancel_url: `${process.env.APP_URL}/pricing?canceled=1`,
      customer: user.entitlement?.stripeCustomerId ?? undefined,
      customer_email: user.entitlement?.stripeCustomerId ? undefined : email,
      metadata: {
        email,
        type,
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
