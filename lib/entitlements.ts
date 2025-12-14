// lib/entitlements.ts
import { prisma } from "@/lib/prisma";
import { getJstYmd } from "@/lib/time";

export async function getOrCreateUserByEmail(email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      entitlement: { create: {} },
    },
    include: { entitlement: true },
  });

  return user;
}

export async function getEntitlement(email: string) {
  const user = await getOrCreateUserByEmail(email);
  if (!user.entitlement) {
    return prisma.entitlement.create({
      data: { userId: user.id },
    });
  }
  return user.entitlement;
}

export async function addCredits(email: string, creditsToAdd: number) {
  const user = await getOrCreateUserByEmail(email);

  await prisma.entitlement.update({
    where: { userId: user.id },
    data: {
      credits: { increment: creditsToAdd },
    },
  });
}

export async function setPremiumPlan(params: {
  email: string;
  stripeCustomerId?: string;
  stripeSubId?: string | null;
  active: boolean;
}) {
  const user = await getOrCreateUserByEmail(params.email);

  await prisma.entitlement.update({
    where: { userId: user.id },
    data: {
      plan: params.active ? "premium" : "free",
      stripeCustomerId:
        params.stripeCustomerId ?? user.entitlement?.stripeCustomerId,
      stripeSubId: params.stripeSubId ?? user.entitlement?.stripeSubId,
    },
  });
}

export async function consumeOneCredit(email: string) {
  const user = await getOrCreateUserByEmail(email);
  const ent = user.entitlement!;

  if (ent.plan === "premium") {
    return { ok: true as const, reason: "premium" as const };
  }

  if (ent.credits <= 0) {
    return { ok: false as const, reason: "no_credits" as const };
  }

  await prisma.entitlement.update({
    where: { userId: user.id },
    data: {
      credits: { decrement: 1 },
    },
  });

  return { ok: true as const, reason: "credit" as const };
}

export async function canUseDailyFree(email: string) {
  const user = await getOrCreateUserByEmail(email);
  const ymd = getJstYmd();

  const used = await prisma.readingLog.findFirst({
    where: {
      userId: user.id,
      ymd,
      kind: "daily_free",
    },
  });

  return !used;
}

export async function markDailyFreeUsed(email: string, spread: string) {
  const user = await getOrCreateUserByEmail(email);
  const ymd = getJstYmd();

  await prisma.readingLog.create({
    data: {
      userId: user.id,
      ymd,
      kind: "daily_free",
      spread,
    },
  });
}

export async function logReading(
  email: string,
  kind: string,
  spread: string
) {
  const user = await getOrCreateUserByEmail(email);
  const ymd = getJstYmd();

  await prisma.readingLog.create({
    data: {
      userId: user.id,
      ymd,
      kind,
      spread,
    },
  });
}
