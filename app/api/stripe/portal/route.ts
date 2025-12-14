// app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email: string };

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

  const customerId = user?.entitlement?.stripeCustomerId;

  if (!customerId) {
    return NextResponse.json(
      { error: "no Stripe customer associated with this email" },
      { status: 400 }
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/pricing`,
  });

  return NextResponse.json({ url: portal.url });
}
