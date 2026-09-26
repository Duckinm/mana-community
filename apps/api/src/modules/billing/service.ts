import Stripe from "stripe";
import { AppError } from "@api/lib/errors";
import {
  confirmCheckoutSessionWithStripe,
  createCheckoutSessionWithStripe,
  getBillingOverviewWithStripe,
  listInvoicesWithStripe,
} from "@api/modules/billing/billing-read";
import {
  changePlanWithStripe,
  createPortalSessionWithStripe,
  previewPlanChangeWithStripe,
  restoreSubscriptionChangeWithStripe,
} from "@api/modules/billing/plan-changes";
import { getPlanMonthlyPriceCentsWithStripe, getStripeClient, type BillingInterval } from "@api/modules/billing/stripe-core";

export {
  getStripeClient,
  getUserPlan,
  isDeferredPlanChange,
  isEntitledSubscriptionStatus,
  isMissingCustomer,
  isPlanDowngrade,
  isStripeConfigured,
  isStripeWebhookConfigured,
  planForPriceId,
  planForSubscription,
  syncUserSubscriptionProjection,
  type BillingInterval,
  type Plan,
} from "@api/modules/billing/stripe-core";
export type {
  BillingOverview,
  InvoiceSummary,
  PendingPlanChange,
  PlanPrice,
} from "@api/modules/billing/billing-read";
export type { PlanChangePreview } from "@api/modules/billing/plan-changes";

type StripeProvider = () => Stripe | null;

function requireStripe(getStripe: StripeProvider): Stripe {
  const stripe = getStripe();
  if (!stripe) throw new AppError("Billing is not configured yet", 501);
  return stripe;
}

export function createBillingOperations(getStripe: StripeProvider) {
  return {
    async getPlanMonthlyPriceCents(plan: "mana" | "aether", interval: BillingInterval) {
      const stripe = getStripe();
      return stripe ? getPlanMonthlyPriceCentsWithStripe(stripe, plan, interval) : null;
    },
    async createCheckoutSession(
      userId: string,
      plan: "mana" | "aether",
      interval: BillingInterval,
      idempotencyKey: string,
    ) {
      return createCheckoutSessionWithStripe(requireStripe(getStripe), userId, plan, interval, idempotencyKey);
    },
    async listInvoices(userId: string) {
      return listInvoicesWithStripe(requireStripe(getStripe), userId);
    },
    async getBillingOverview(userId: string) {
      return getBillingOverviewWithStripe(requireStripe(getStripe), userId);
    },
    async confirmCheckoutSession(userId: string, sessionId: string) {
      return confirmCheckoutSessionWithStripe(requireStripe(getStripe), userId, sessionId);
    },
    async previewPlanChange(userId: string, plan: "mana" | "aether", interval: BillingInterval) {
      return previewPlanChangeWithStripe(requireStripe(getStripe), userId, plan, interval);
    },
    async changePlan(
      userId: string,
      plan: "mana" | "aether",
      interval: BillingInterval,
      idempotencyKey: string,
      prorationDate?: number,
    ) {
      return changePlanWithStripe(requireStripe(getStripe), userId, plan, interval, idempotencyKey, prorationDate);
    },
    async restoreSubscriptionChange(userId: string) {
      return restoreSubscriptionChangeWithStripe(requireStripe(getStripe), userId);
    },
    async createPortalSession(userId: string, flow?: "cancel") {
      return createPortalSessionWithStripe(requireStripe(getStripe), userId, flow);
    },
  };
}

export const {
  getPlanMonthlyPriceCents,
  createCheckoutSession,
  listInvoices,
  getBillingOverview,
  confirmCheckoutSession,
  previewPlanChange,
  changePlan,
  restoreSubscriptionChange,
  createPortalSession,
} = createBillingOperations(getStripeClient);
