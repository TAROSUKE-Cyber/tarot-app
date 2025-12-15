// app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import "@/lib/entitlements"; // entitlement 初期化のため

// Stripe の Node SDK を使う
export const runtime = "nodejs";
// ビルド時に静的プリレンダさせない
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

    if (!user || !user.entitlement?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer for this user" },
        { status: 404 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.entitlement.stripeCustomerId,
      return_url: `${process.env.APP_URL}/pricing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[/api/stripe/portal] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
