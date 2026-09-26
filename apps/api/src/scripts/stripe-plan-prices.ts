import { config } from "dotenv";

config({ path: ".env" });
config({ path: "../../.env" });

import {
  PLAN_PRICING_THB,
  type PaidPlanId,
} from "@mana/db/plan-entitlements";
import Stripe from "stripe";

const PLAN_LABELS: Record<PaidPlanId, string> = {
  mana: "Mana",
  aether: "Aether",
};

const LEGACY_PRODUCT_NAMES: Record<PaidPlanId, string[]> = {
  mana: ["Mana", "Solo"],
  aether: ["Aether", "Pro"],
};

const ENV_KEYS: Record<PaidPlanId, { monthly: string; annual: string }> = {
  mana: {
    monthly: "STRIPE_PRICE_SOLO_MONTHLY",
    annual: "STRIPE_PRICE_SOLO_ANNUAL",
  },
  aether: {
    monthly: "STRIPE_PRICE_PRO_MONTHLY",
    annual: "STRIPE_PRICE_PRO_ANNUAL",
  },
};

function thbUnitAmount(amount: number): number {
  return Math.round(amount * 100);
}

async function findProduct(
  stripe: Stripe,
  plan: PaidPlanId,
): Promise<Stripe.Product> {
  for (const name of LEGACY_PRODUCT_NAMES[plan]) {
    const matches = await stripe.products.search({
      query: `active:'true' AND name:'${name}'`,
      limit: 1,
    });
    if (matches.data[0]) return matches.data[0];
  }

  return stripe.products.create({
    name: PLAN_LABELS[plan],
    metadata: { plan },
  });
}

async function createPrice(
  stripe: Stripe,
  productId: string,
  plan: PaidPlanId,
  interval: "month" | "year",
  amountThb: number,
): Promise<Stripe.Price> {
  return stripe.prices.create({
    product: productId,
    currency: "thb",
    unit_amount: thbUnitAmount(amountThb),
    recurring: { interval },
    metadata: {
      plan,
      billing_interval: interval === "month" ? "monthly" : "annual",
    },
  });
}

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("Missing STRIPE_SECRET_KEY — set it in .env or apps/api/.env");
  process.exit(1);
}

const stripe = new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" });
const created: Record<string, string> = {};

for (const plan of ["mana", "aether"] as const) {
  const product = await findProduct(stripe, plan);
  const pricing = PLAN_PRICING_THB[plan];

  const monthly = await createPrice(
    stripe,
    product.id,
    plan,
    "month",
    pricing.monthly,
  );
  const annual = await createPrice(
    stripe,
    product.id,
    plan,
    "year",
    pricing.annual,
  );

  created[ENV_KEYS[plan].monthly] = monthly.id;
  created[ENV_KEYS[plan].annual] = annual.id;

  console.log(
    `${PLAN_LABELS[plan]}: THB ${pricing.monthly}/mo · THB ${pricing.annual}/yr`,
  );
  console.log(`  product ${product.id}`);
  console.log(`  monthly price ${monthly.id}`);
  console.log(`  annual price ${annual.id}`);
}

console.log("\nUpdate env vars:");
for (const [key, value] of Object.entries(created)) {
  console.log(`${key}=${value}`);
}

console.log(
  "\nStripe prices are immutable — point env at the new IDs above. Existing subscriptions keep their current price until changed.",
);
