// app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addCredits, setPremiumPlan } from "@/lib/entitlements";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const email = session.metadata?.email as string | undefined;
        const type = session.metadata?.type as
          | "single"
          | "ticket10"
          | "subMonthly"
          | undefined;

        if (!email || !type) break;

        if (session.customer) {
          const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: { email, entitlement: { create: {} } },
            include: { entitlement: true },
          });

          await prisma.entitlement.update({
            where: { userId: user.id },
            data: { stripeCustomerId: session.customer as string },
          });
        }

        // 購入履歴
        await prisma.purchase.create({
          data: {
            user: { connect: { email } },
            type:
              type === "subMonthly"
                ? "subscription"
                : type === "ticket10"
                ? "ticket"
                : "single",
            stripeSessionId: session.id,
            amount: session.amount_total ?? null,
            currency: session.currency ?? null,
          },
        });

        // クレジット or プレミアム付与
        if (type === "single") {
          await addCredits(email, 1);
        } else if (type === "ticket10") {
          await addCredits(email, 10);
        } else if (type === "subMonthly") {
          await setPremiumPlan({
            email,
            stripeCustomerId: session.customer ?? undefined,
            stripeSubId: session.subscription ?? undefined,
            active: true,
          });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;

        const ent = await prisma.entitlement.findFirst({
          where: { stripeCustomerId: customerId },
          include: { user: true },
        });

        if (!ent?.user?.email) break;

        const active =
          sub.status === "active" || sub.status === "trialing";

        await setPremiumPlan({
          email: ent.user.email,
          stripeCustomerId: customerId,
          stripeSubId: sub.id,
          active,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;

        const ent = await prisma.entitlement.findFirst({
          where: { stripeCustomerId: customerId },
          include: { user: true },
        });

        if (!ent?.user?.email) break;

        await setPremiumPlan({
          email: ent.user.email,
          stripeCustomerId: customerId,
          stripeSubId: null,
          active: false,
        });

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
}
