import { users } from "@mana/db";
import { type PlanId } from "@mana/db/plan-entitlements";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@api/db";
import { env } from "@api/env";
import { AppError } from "@api/lib/errors";
import { reconcileProjectCap } from "@api/modules/billing/entitlements";

export type Plan = PlanId;
export type BillingInterval = "monthly" | "annual";

let stripeClient: Stripe | null = null;

/** Lazily construct the Stripe client — returns null when STRIPE_SECRET_KEY isn't configured yet. */
export function getStripeClient(): Stripe | null {
  if (env.DEPLOYMENT_MODE === "self-hosted" || !env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return stripeClient;
}

export function isStripeConfigured(): boolean {
  return env.DEPLOYMENT_MODE !== "self-hosted" && Boolean(env.STRIPE_SECRET_KEY);
}

export async function getUserPlan(userId: string): Promise<Plan | null> {
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId));
  return (user?.plan as Plan | undefined) ?? null;
}

const PRICE_IDS: Record<
  "mana" | "aether",
  Record<BillingInterval, string | undefined>
> = {
  mana: {
    monthly: env.STRIPE_PRICE_SOLO_MONTHLY,
    annual: env.STRIPE_PRICE_SOLO_ANNUAL,
  },
  aether: {
    monthly: env.STRIPE_PRICE_PRO_MONTHLY,
    annual: env.STRIPE_PRICE_PRO_ANNUAL,
  },
};

/** Grandfathered Stripe price IDs — existing subs keep billing until they change plan. */
const LEGACY_PRICE_IDS: Record<
  string,
  { plan: "mana" | "aether"; interval: BillingInterval }
> = {
  price_1TolncGY7ZW1aQHHeFj8St55: { plan: "mana", interval: "monthly" },
  price_1TolndGY7ZW1aQHHLEKq9rIK: { plan: "mana", interval: "annual" },
  price_1TolndGY7ZW1aQHHDT3Borru: { plan: "aether", interval: "monthly" },
  price_1TolneGY7ZW1aQHHdSMZilK7: { plan: "aether", interval: "annual" },
};

export function prorationDateNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function priceIdFor(plan: "mana" | "aether", interval: BillingInterval): string {
  const priceId = PRICE_IDS[plan][interval];
  if (!priceId)
    throw new AppError(
      `Stripe price not configured for ${plan}/${interval}`,
      501,
    );
  return priceId;
}

const planPriceCache = new Map<string, { cents: number; currency: string }>();

/** Monthly-equivalent price for a paid plan, from the live Stripe price object (annual /12, rounded). Cached for the process lifetime — restart to pick up a Stripe price change. */
export async function getPlanMonthlyPriceCentsWithStripe(
  stripe: Stripe,
  plan: "mana" | "aether",
  interval: BillingInterval,
): Promise<{ cents: number; currency: string } | null> {
  const cacheKey = `${plan}:${interval}`;
  const cached = planPriceCache.get(cacheKey);
  if (cached) return cached;
  const price = await stripe.prices.retrieve(priceIdFor(plan, interval));
  if (typeof price.unit_amount !== "number") return null;
  const cents = interval === "annual" ? Math.round(price.unit_amount / 12) : price.unit_amount;
  const result = { cents, currency: price.currency };
  planPriceCache.set(cacheKey, result);
  return result;
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

/** Reverse lookup: Stripe price ID -> { plan, interval }. Built lazily so env vars are read once configured. */
export function planForPriceId(
  priceId: string,
): { plan: "mana" | "aether"; interval: BillingInterval } | null {
  for (const plan of ["mana", "aether"] as const) {
    for (const interval of ["monthly", "annual"] as const) {
      if (PRICE_IDS[plan][interval] === priceId) return { plan, interval };
    }
  }
  return LEGACY_PRICE_IDS[priceId] ?? null;
}

export function planForSubscription(
  subscription: Stripe.Subscription,
): { plan: "mana" | "aether"; interval: BillingInterval; item: Stripe.SubscriptionItem } | null {
  for (const item of subscription.items.data) {
    const resolved = planForPriceId(item.price.id);
    if (resolved) return { ...resolved, item };
  }
  return null;
}

export function isEntitledSubscriptionStatus(
  status: Stripe.Subscription.Status,
): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export const PLAN_RANK: Record<Plan, number> = { free: 0, mana: 1, aether: 2 };

/** Lower entitlement or a shorter annual commitment starts at renewal. */
export function isDeferredPlanChange(
  currentPlan: Plan,
  currentInterval: BillingInterval,
  nextPlan: Plan,
  nextInterval: BillingInterval,
): boolean {
  return (
    PLAN_RANK[nextPlan] < PLAN_RANK[currentPlan] ||
    (currentInterval === "annual" && nextInterval === "monthly")
  );
}

export function isPlanDowngrade(currentPlan: Plan, nextPlan: Plan): boolean {
  return PLAN_RANK[nextPlan] < PLAN_RANK[currentPlan];
}

// A customer id minted by a different Stripe account — the test → live cutover, a
// key rotation — does not exist here, so Stripe answers resource_missing. The only
// caller-supplied id in the calls guarded below is the customer, and a user whose
// customer is gone has no billing on this account: answer that, don't 500.
export function isMissingCustomer(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError &&
    err.code === "resource_missing"
  );
}

export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  userId: string,
): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);

  if (user.stripeCustomerId) {
    try {
      const stored = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!stored.deleted) return stored.id;
    } catch (err) {
      if (!isMissingCustomer(err)) throw err;
    }
  }

  const matches = (await stripe.customers.list({ email: user.email, limit: 10 })).data;
  const existing =
    matches.find((customer) => customer.metadata?.userId === userId) ??
    matches.find((customer) => !customer.metadata?.userId);
  const customer =
    existing ??
    (await stripe.customers.create(
      {
        email: user.email,
        name: user.name,
        metadata: { userId },
      },
      { idempotencyKey: `mana-customer:${userId}` },
    ));

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}

const OPEN_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

export async function findCurrentStripeSubscription(
  stripe: Stripe,
  user: typeof users.$inferSelect,
): Promise<Stripe.Subscription | null> {
  if (user.stripeSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      if (OPEN_SUBSCRIPTION_STATUSES.has(subscription.status)) return subscription;
    } catch {
      // The Stripe list below is the authority when the local projection is stale.
    }
  }
  if (!user.stripeCustomerId) return null;
  let subscriptions: Stripe.ApiList<Stripe.Subscription>;
  try {
    subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 20,
    });
  } catch (err) {
    if (isMissingCustomer(err)) return null;
    throw err;
  }
  return (
    subscriptions.data.find((subscription) =>
      OPEN_SUBSCRIPTION_STATUSES.has(subscription.status),
    ) ?? null
  );
}

export async function syncUserSubscriptionProjection(
  userId: string,
  subscription: Stripe.Subscription,
  eventCreated?: number,
): Promise<void> {
  const resolved = planForSubscription(subscription);
  const entitled = isEntitledSubscriptionStatus(subscription.status);
  const periodEnd = resolved?.item.current_period_end;
  const eventAt = eventCreated ? new Date(eventCreated * 1000) : new Date();
  const patch: Partial<typeof users.$inferInsert> = {
    stripeSubscriptionId: subscription.status === "canceled" ? null : subscription.id,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeEventAt: eventAt,
    updatedAt: new Date(),
  };
  if (!entitled) {
    patch.plan = "free";
    patch.billingInterval = null;
  } else if (resolved) {
    patch.plan = resolved.plan;
    patch.billingInterval = resolved.interval;
  }
  // Stripe doesn't guarantee webhook delivery order — a retried, older event landing
  // after a newer one has already applied must not roll the projection backwards.
  const [row] = await db
    .update(users)
    .set(patch)
    .where(and(eq(users.id, userId), or(isNull(users.stripeEventAt), lte(users.stripeEventAt, eventAt))))
    .returning({ plan: users.plan });
  if (row) await reconcileProjectCap(userId, row.plan as PlanId);
}
