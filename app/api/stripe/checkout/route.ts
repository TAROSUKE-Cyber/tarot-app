// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import "@/lib/entitlements"; // side-effectでprisma初期化用に読み込むだけでもOK

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
  const { email, type } = (await req.json()) as {
    email: string;
    type: PurchaseType;
  };

  if (!email || !type) {
    return NextResponse.json(
      { error: "email and type are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, entitlement: { create: {} } },
    include: { entitlement: true },
  });

  const mode = purchaseToMode(type);
  const priceId = PRICES[type];

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
}
