import { users } from "@mana/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@api/db";
import { env } from "@api/env";
import { AppError } from "@api/lib/errors";
import {
  findCurrentStripeSubscription,
  isDeferredPlanChange,
  isMissingCustomer,
  planForSubscription,
  priceIdFor,
  prorationDateNow,
  syncUserSubscriptionProjection,
  type BillingInterval,
} from "@api/modules/billing/stripe-core";
import { isManaSchedule, retrieveSchedule } from "@api/modules/billing/billing-read";

export type PlanChangePreview = {
  mode: "immediate" | "scheduled";
  lines: { description: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  effectiveAt: string | null;
  nextAmount: number | null;
  prorationDate: number | null;
};

export async function previewPlanChangeWithStripe(
  stripe: Stripe,
  userId: string,
  plan: "mana" | "aether",
  interval: BillingInterval,
): Promise<PlanChangePreview> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  if (!user.stripeCustomerId) {
    throw new AppError("No active subscription to change", 400);
  }

  const newPriceId = priceIdFor(plan, interval);
  const subscription = await findCurrentStripeSubscription(stripe, user);
  if (!subscription) throw new AppError("No active subscription to change", 400);
  const current = planForSubscription(subscription);
  if (!current) throw new AppError("Current Stripe price is not recognized", 409);
  if (current.item.price.id === newPriceId) {
    throw new AppError("Already on this plan", 400);
  }
  if (subscription.cancel_at_period_end) {
    throw new AppError("Resume the subscription before changing plans", 409);
  }

  const mode = isDeferredPlanChange(
    current.plan,
    current.interval,
    plan,
    interval,
  )
    ? "scheduled"
    : "immediate";
  const prorationDate = mode === "immediate" ? prorationDateNow() : null;
  const nextPrice = await stripe.prices.retrieve(newPriceId);
  if (nextPrice.unit_amount === null) {
    throw new AppError("Stripe price has no fixed amount", 500);
  }
  const nextAmount = nextPrice.unit_amount / 100;

  // Scheduled changes take effect at the next renewal, so the total due then is
  // simply the plan's price — previewing via invoices.createPreview against the
  // *current* subscription mid-cycle (proration_behavior "none") does not model a
  // future-dated change and returns a bogus partial-period figure.
  if (mode === "scheduled") {
    return {
      mode,
      lines: [],
      subtotal: nextAmount,
      tax: 0,
      total: nextAmount,
      currency: nextPrice.currency,
      effectiveAt: new Date(current.item.current_period_end * 1000).toISOString(),
      nextAmount,
      prorationDate: null,
    };
  }

  const preview = await stripe.invoices.createPreview({
    customer: user.stripeCustomerId,
    subscription: subscription.id,
    subscription_details: {
      items: [{ id: current.item.id, price: newPriceId }],
      proration_behavior: "always_invoice",
      ...(prorationDate ? { proration_date: prorationDate } : {}),
    },
  });

  const subtotal = preview.subtotal / 100;
  const total = preview.total / 100;
  const lines =
    current.interval === interval
      ? preview.lines.data.filter(
          (line) => line.parent?.subscription_item_details?.proration,
        )
      : preview.lines.data;
  return {
    mode,
    lines: lines.map((line) => ({
      description: line.description ?? "",
      amount: line.amount / 100,
    })),
    subtotal,
    tax: total - subtotal,
    total,
    currency: preview.currency,
    effectiveAt: null,
    nextAmount,
    prorationDate,
  };
}

function stripeId(value: string | { id: string } | null | undefined): string | undefined {
  return typeof value === "string" ? value : value?.id;
}

function phaseDiscounts(
  discounts: Stripe.SubscriptionSchedule.Phase.Discount[],
): Stripe.SubscriptionScheduleUpdateParams.Phase.Discount[] {
  return discounts.map((entry) => ({
    ...(entry.discount ? { discount: stripeId(entry.discount) } : {}),
    ...(entry.coupon ? { coupon: stripeId(entry.coupon) } : {}),
    ...(entry.promotion_code
      ? { promotion_code: stripeId(entry.promotion_code) }
      : {}),
  }));
}

function phaseItems(
  items: Stripe.SubscriptionSchedule.Phase.Item[],
  replace?: { currentPriceId: string; nextPriceId: string },
): Stripe.SubscriptionScheduleUpdateParams.Phase.Item[] {
  return items.map((item) => {
    const currentPriceId = stripeId(item.price)!;
    return {
      price:
        replace?.currentPriceId === currentPriceId
          ? replace.nextPriceId
          : currentPriceId,
      ...(item.quantity !== undefined ? { quantity: item.quantity } : {}),
      ...(item.billing_thresholds?.usage_gte != null
        ? { billing_thresholds: { usage_gte: item.billing_thresholds.usage_gte } }
        : {}),
      ...(item.discounts.length ? { discounts: phaseDiscounts(item.discounts) } : {}),
      ...(item.metadata ? { metadata: item.metadata } : {}),
      ...(item.tax_rates
        ? { tax_rates: item.tax_rates.map((rate) => stripeId(rate)!) }
        : {}),
    };
  });
}

function phaseParams(
  phase: Stripe.SubscriptionSchedule.Phase,
  options: {
    startDate: number;
    endDate?: number;
    items: Stripe.SubscriptionScheduleUpdateParams.Phase.Item[];
    includeTrial: boolean;
  },
): Stripe.SubscriptionScheduleUpdateParams.Phase {
  if (phase.add_invoice_items.length) {
    throw new AppError(
      "This subscription has scheduled invoice items and must be changed in Stripe",
      409,
    );
  }
  return {
    items: options.items,
    start_date: options.startDate,
    ...(options.endDate ? { end_date: options.endDate } : {}),
    proration_behavior: "none",
    ...(phase.application_fee_percent !== null
      ? { application_fee_percent: phase.application_fee_percent }
      : {}),
    ...(phase.automatic_tax
      ? {
          automatic_tax: {
            enabled: phase.automatic_tax.enabled,
            ...(phase.automatic_tax.liability
              ? {
                  liability: {
                    type: phase.automatic_tax.liability.type,
                    ...(stripeId(phase.automatic_tax.liability.account)
                      ? { account: stripeId(phase.automatic_tax.liability.account) }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(phase.billing_thresholds
      ? {
          billing_thresholds: {
            amount_gte: phase.billing_thresholds.amount_gte ?? undefined,
            reset_billing_cycle_anchor:
              phase.billing_thresholds.reset_billing_cycle_anchor ?? undefined,
          },
        }
      : {}),
    ...(phase.collection_method ? { collection_method: phase.collection_method } : {}),
    ...(phase.currency ? { currency: phase.currency } : {}),
    ...(stripeId(phase.default_payment_method)
      ? { default_payment_method: stripeId(phase.default_payment_method) }
      : {}),
    ...(phase.default_tax_rates
      ? { default_tax_rates: phase.default_tax_rates.map((rate) => stripeId(rate)!) }
      : {}),
    ...(phase.description !== null ? { description: phase.description } : {}),
    ...(phase.discounts.length ? { discounts: phaseDiscounts(phase.discounts) } : {}),
    ...(phase.invoice_settings
      ? {
          invoice_settings: {
            ...(phase.invoice_settings.account_tax_ids
              ? {
                  account_tax_ids: phase.invoice_settings.account_tax_ids.map(
                    (taxId) => stripeId(taxId)!,
                  ),
                }
              : {}),
            ...(phase.invoice_settings.days_until_due !== null
              ? { days_until_due: phase.invoice_settings.days_until_due }
              : {}),
            ...(phase.invoice_settings.issuer
              ? {
                  issuer: {
                    type: phase.invoice_settings.issuer.type,
                    ...(stripeId(phase.invoice_settings.issuer.account)
                      ? { account: stripeId(phase.invoice_settings.issuer.account) }
                      : {}),
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(phase.metadata ? { metadata: phase.metadata } : {}),
    ...(stripeId(phase.on_behalf_of)
      ? { on_behalf_of: stripeId(phase.on_behalf_of) }
      : {}),
    ...(phase.transfer_data
      ? {
          transfer_data: {
            destination: stripeId(phase.transfer_data.destination)!,
            ...(phase.transfer_data.amount_percent !== null
              ? { amount_percent: phase.transfer_data.amount_percent }
              : {}),
          },
        }
      : {}),
    ...(options.includeTrial && phase.trial_end
      ? { trial_end: phase.trial_end }
      : {}),
  };
}

async function schedulePlanChange(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  userId: string,
  current: NonNullable<ReturnType<typeof planForSubscription>>,
  plan: "mana" | "aether",
  interval: BillingInterval,
  newPriceId: string,
  idempotencyKey: string,
): Promise<string> {
  const existingSchedule = await retrieveSchedule(stripe, subscription);
  if (existingSchedule && !isManaSchedule(existingSchedule, userId)) {
    throw new AppError("This subscription already has a change managed in Stripe", 409);
  }
  const created = !existingSchedule;
  const schedule =
    existingSchedule ??
    (await stripe.subscriptionSchedules.create(
      { from_subscription: subscription.id },
      { idempotencyKey: `${idempotencyKey}:schedule` },
    ));
  const currentPhase = schedule.current_phase
    ? schedule.phases.find(
        (phase) => phase.start_date === schedule.current_phase?.start_date,
      )
    : undefined;
  if (!currentPhase) throw new AppError("Unable to schedule this plan change", 500);
  const periodEnd = current.item.current_period_end;
  const currentItems = phaseItems(currentPhase.items);
  const nextItems = phaseItems(currentPhase.items, {
    currentPriceId: current.item.price.id,
    nextPriceId: newPriceId,
  });
  if (!nextItems.some((item) => item.price === newPriceId)) {
    throw new AppError("Unable to find the current plan item in the schedule", 409);
  }

  try {
    await stripe.subscriptionSchedules.update(
      schedule.id,
      {
        metadata: { source: "mana", userId },
        end_behavior: "release",
        proration_behavior: "none",
        phases: [
          phaseParams(currentPhase, {
            startDate: currentPhase.start_date,
            endDate: periodEnd,
            items: currentItems,
            includeTrial: true,
          }),
          {
            ...phaseParams(currentPhase, {
              startDate: periodEnd,
              items: nextItems,
              includeTrial: false,
            }),
            billing_cycle_anchor: "phase_start",
            duration: {
              interval: interval === "monthly" ? "month" : "year",
              interval_count: 1,
            },
            metadata: { userId, plan, interval, source: "mana" },
          },
        ],
      },
      { idempotencyKey: `${idempotencyKey}:phases` },
    );
  } catch (error) {
    if (created) {
      await stripe.subscriptionSchedules.release(schedule.id).catch(() => undefined);
    }
    throw error;
  }
  return new Date(periodEnd * 1000).toISOString();
}

function validateProrationDate(
  requested: number | undefined,
  item: Stripe.SubscriptionItem,
): number {
  const now = prorationDateNow();
  if (
    !requested ||
    requested < item.current_period_start ||
    requested > item.current_period_end ||
    requested < now - 30 * 60 ||
    requested > now + 5
  ) {
    throw new AppError("Plan preview expired — refresh it and confirm again", 400);
  }
  return requested;
}

async function releaseManagedSchedule(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  userId: string,
  idempotencyKey: string,
): Promise<void> {
  const schedule = await retrieveSchedule(stripe, subscription);
  if (!schedule) return;
  if (!isManaSchedule(schedule, userId)) {
    throw new AppError("This subscription has a change managed in Stripe", 409);
  }
  await stripe.subscriptionSchedules.release(
    schedule.id,
    {},
    { idempotencyKey },
  );
}

export async function changePlanWithStripe(
  stripe: Stripe,
  userId: string,
  plan: "mana" | "aether",
  interval: BillingInterval,
  idempotencyKey: string,
  prorationDate?: number,
): Promise<{
  success: true;
  status: "applied" | "scheduled" | "payment_required";
  effectiveAt: string | null;
  paymentUrl: string | null;
}> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  const newPriceId = priceIdFor(plan, interval);
  const subscription = await findCurrentStripeSubscription(stripe, user);
  if (!subscription) throw new AppError("No active subscription to change", 400);
  if (subscription.cancel_at_period_end) {
    throw new AppError("Resume the subscription before changing plans", 409);
  }
  const current = planForSubscription(subscription);
  if (!current) throw new AppError("Current Stripe price is not recognized", 409);
  if (current.item.price.id === newPriceId) {
    throw new AppError("Already on this plan", 400);
  }

  if (isDeferredPlanChange(current.plan, current.interval, plan, interval)) {
    const effectiveAt = await schedulePlanChange(
      stripe,
      subscription,
      userId,
      current,
      plan,
      interval,
      newPriceId,
      idempotencyKey,
    );
    return {
      success: true,
      status: "scheduled",
      effectiveAt,
      paymentUrl: null,
    };
  }

  await releaseManagedSchedule(
    stripe,
    subscription,
    userId,
    `${idempotencyKey}:release`,
  );
  const updated = await stripe.subscriptions.update(
    subscription.id,
    {
      items: [{ id: current.item.id, price: newPriceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      proration_date: validateProrationDate(prorationDate, current.item),
      expand: ["latest_invoice"],
    },
    { idempotencyKey },
  );
  await syncUserSubscriptionProjection(userId, updated);
  if (updated.pending_update) {
    const invoice = updated.latest_invoice;
    const expandedInvoice =
      typeof invoice === "string" ? await stripe.invoices.retrieve(invoice) : invoice;
    return {
      success: true,
      status: "payment_required",
      effectiveAt: null,
      paymentUrl: expandedInvoice?.hosted_invoice_url ?? null,
    };
  }
  return {
    success: true,
    status: "applied",
    effectiveAt: null,
    paymentUrl: null,
  };
}

export async function restoreSubscriptionChangeWithStripe(
  stripe: Stripe,
  userId: string,
): Promise<{ success: true }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  const subscription = await findCurrentStripeSubscription(stripe, user);
  if (!subscription) throw new AppError("No active subscription", 400);
  const schedule = await retrieveSchedule(stripe, subscription);
  if (schedule) {
    if (!isManaSchedule(schedule, userId)) {
      throw new AppError("This change must be restored in Stripe", 409);
    }
    await stripe.subscriptionSchedules.release(schedule.id);
  }
  if (subscription.cancel_at_period_end) {
    const restored = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
    await syncUserSubscriptionProjection(userId, restored);
  }
  return { success: true };
}

export async function createPortalSessionWithStripe(
  stripe: Stripe,
  userId: string,
  flow?: "cancel",
): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError("User not found", 404);
  if (!user.stripeCustomerId) {
    throw new AppError("No billing account found — subscribe to a plan first", 400);
  }
  const subscription = flow === "cancel" ? await findCurrentStripeSubscription(stripe, user) : null;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.WEB_URL}/settings/billing`,
      ...(flow === "cancel" && subscription
        ? {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: { subscription: subscription.id },
            },
          }
        : {}),
    });
    return session.url;
  } catch (err) {
    if (isMissingCustomer(err)) {
      throw new AppError("No billing account found — subscribe to a plan first", 400);
    }
    throw err;
  }
}
