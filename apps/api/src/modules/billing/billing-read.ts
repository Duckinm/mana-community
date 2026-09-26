import { users } from "@mana/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@api/db";
import { env } from "@api/env";
import { AppError } from "@api/lib/errors";
import { reconcileProjectCap } from "@api/modules/billing/entitlements";
import {
  findCurrentStripeSubscription,
  getOrCreateStripeCustomer,
  isMissingCustomer,
  planForPriceId,
  planForSubscription,
  priceIdFor,
  syncUserSubscriptionProjection,
  type BillingInterval,
} from "@api/modules/billing/stripe-core";

export async function createCheckoutSessionWithStripe(
  stripe: Stripe,
  userId: string,
  plan: "mana" | "aether",
  interval: BillingInterval,
  idempotencyKey: string,
): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  const customerId = await getOrCreateStripeCustomer(stripe, userId);
  const current = await findCurrentStripeSubscription(stripe, {
    ...user,
    stripeCustomerId: customerId,
  });
  if (current) {
    throw new AppError(
      "Already subscribed — use Adjust plan to switch plans instead",
      400,
    );
  }

  const priceId = priceIdFor(plan, interval);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${env.WEB_URL}/settings/billing?success=1&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.WEB_URL}/settings/billing?canceled=1`,
      metadata: { userId, plan, interval },
      subscription_data: {
        metadata: { userId, plan, interval },
      },
    },
    { idempotencyKey },
  );

  if (!session.url)
    throw new AppError("Failed to create checkout session", 500);
  return session.url;
}

export type InvoiceSummary = {
  id: string;
  date: string;
  total: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
};

export async function listInvoicesWithStripe(stripe: Stripe, userId: string): Promise<InvoiceSummary[]> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  if (!user.stripeCustomerId) return [];
  const subscription = await findCurrentStripeSubscription(stripe, user);

  let invoices: Stripe.ApiList<Stripe.Invoice>;
  try {
    invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      subscription: subscription?.id,
      limit: 12,
    });
  } catch (err) {
    if (isMissingCustomer(err)) return [];
    throw err;
  }

  return invoices.data.map((invoice) => ({
    id: invoice.id ?? "",
    date: new Date(invoice.created * 1000).toISOString(),
    total: invoice.total / 100,
    currency: invoice.currency,
    status: invoice.status ?? "unknown",
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
  }));
}

export type PlanPrice = {
  plan: "mana" | "aether";
  interval: BillingInterval;
  amount: number;
  currency: string;
};

export type PendingPlanChange = {
  plan: "mana" | "aether";
  interval: BillingInterval;
  effectiveAt: string;
  manageable: boolean;
};

export type BillingOverview = {
  prices: PlanPrice[];
  subscription: {
    id: string;
    plan: "mana" | "aether" | null;
    interval: BillingInterval | null;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    pendingChange: PendingPlanChange | null;
    paymentPending: boolean;
    paymentUrl: string | null;
  } | null;
};

export async function getPlanCatalog(stripe: Stripe): Promise<PlanPrice[]> {
  return Promise.all(
    (["mana", "aether"] as const).flatMap((plan) =>
      (["monthly", "annual"] as const).map(async (interval) => {
        const price = await stripe.prices.retrieve(priceIdFor(plan, interval));
        if (price.unit_amount === null) {
          throw new AppError(`Stripe price has no fixed amount: ${plan}/${interval}`, 500);
        }
        return {
          plan,
          interval,
          amount: price.unit_amount / 100,
          currency: price.currency,
        };
      }),
    ),
  );
}

export async function retrieveSchedule(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<Stripe.SubscriptionSchedule | null> {
  if (!subscription.schedule) return null;
  return typeof subscription.schedule === "string"
    ? stripe.subscriptionSchedules.retrieve(subscription.schedule)
    : subscription.schedule;
}

export function pendingChangeFromSchedule(
  schedule: Stripe.SubscriptionSchedule | null,
  userId: string,
): PendingPlanChange | null {
  const effectiveAt = schedule?.current_phase?.end_date;
  if (!schedule || !effectiveAt) return null;
  const phase = schedule.phases.find((candidate) => candidate.start_date >= effectiveAt);
  if (!phase) return null;
  for (const item of phase.items) {
    const priceId = typeof item.price === "string" ? item.price : item.price.id;
    const resolved = planForPriceId(priceId);
    if (resolved) {
      return {
        ...resolved,
        effectiveAt: new Date(effectiveAt * 1000).toISOString(),
        manageable: isManaSchedule(schedule, userId),
      };
    }
  }
  return null;
}

export function isManaSchedule(schedule: Stripe.SubscriptionSchedule, userId: string): boolean {
  if (schedule.metadata?.source === "mana") return true;
  if (schedule.metadata?.source === "@better-auth/stripe") return true;
  return schedule.phases.some((phase) => phase.metadata?.userId === userId);
}

export async function getBillingOverviewWithStripe(stripe: Stripe, userId: string): Promise<BillingOverview> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  const [prices, subscription] = await Promise.all([
    getPlanCatalog(stripe),
    findCurrentStripeSubscription(stripe, user),
  ]);
  if (!subscription) {
    if (user.plan !== "free" || user.stripeSubscriptionId) {
      await db
        .update(users)
        .set({
          plan: "free",
          billingInterval: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          stripeEventAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      await reconcileProjectCap(userId, "free");
    }
    return { prices, subscription: null };
  }

  const latestInvoice = subscription.latest_invoice;
  const [schedule, paymentInvoice] = await Promise.all([
    retrieveSchedule(stripe, subscription),
    latestInvoice &&
    (subscription.pending_update || subscription.status === "past_due" || subscription.status === "unpaid")
      ? typeof latestInvoice === "string"
        ? stripe.invoices.retrieve(latestInvoice)
        : latestInvoice
      : null,
    syncUserSubscriptionProjection(userId, subscription),
  ]);
  const resolved = planForSubscription(subscription);
  return {
    prices,
    subscription: {
      id: subscription.id,
      plan: resolved?.plan ?? null,
      interval: resolved?.interval ?? null,
      status: subscription.status,
      currentPeriodEnd: resolved?.item.current_period_end
        ? new Date(resolved.item.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      pendingChange: pendingChangeFromSchedule(schedule, userId),
      paymentPending: Boolean(subscription.pending_update),
      paymentUrl: paymentInvoice?.hosted_invoice_url ?? null,
    },
  };
}

export async function confirmCheckoutSessionWithStripe(
  stripe: Stripe,
  userId: string,
  sessionId: string,
): Promise<{ complete: boolean }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (session.client_reference_id !== userId && session.metadata?.userId !== userId) {
    throw new AppError("Checkout session not found", 404);
  }
  if (session.status !== "complete" || !session.subscription) return { complete: false };
  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;
  await syncUserSubscriptionProjection(userId, subscription);
  return { complete: true };
}
