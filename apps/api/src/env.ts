import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DEPLOYMENT_MODE: z.enum(["cloud", "self-hosted"]).default("cloud"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  WEB_URL: z.string().default("http://localhost:3000"),
  PDF_WEB_ORIGIN: z.url().optional(),
  LANDING_URL: z.url().default("http://localhost:4321"),

  DATABASE_URL: z.url(),

  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  // Model id sent on every Anthropic-compatible request (Auto mode). Defaults to Kimi K2.6 via
  // Moonshot's Anthropic-compatible endpoint — swap ANTHROPIC_BASE_URL/API_KEY/AI_MODEL together
  // to point at any other Anthropic-compatible provider.
  AI_MODEL: z.string().default("kimi-k2.6"),
  OPENROUTER_API_KEY: z.string().optional(),
  // Groq Whisper for voice input transcription — feature degrades to "not configured" until set.
  GROQ_API_KEY: z.string().optional(),
  // Typhoon OCR (SCB 10X) reads Thai documents far better than the chat model does.
  // Unset = attached images go to the chat model as-is, the way they used to.
  TYPHOON_OCR_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().min(1).optional(),
  MAILPIT_URL: z.url().optional(),
  // Bare address or Resend display form: `MANA <support@heymana.app>`
  RESEND_FROM_EMAIL: z
    .string()
    .regex(/^(?:[^<>\s][^<>]*<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/)
    .optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  EMAIL_SANDBOX_WHITELIST: z.string().optional(),

  CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ENDPOINT: z.url().optional(),
  R2_PRESIGN_ENDPOINT: z.url().optional(),
  R2_REGION: z.string().default("auto"),
  R2_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().default("mana"),
  // Publicly-served assets (avatars, contact images) get their own bucket so the private
  // bucket (documents, storage files, payment slips) never needs a public-read policy.
  // Optional so local dev can run with a single bucket; prod sets it.
  R2_PUBLIC_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.url(),

  CRON_SECRET: z.string().optional(),

  // CMS article ingest from the generator workflow. Declared optional the same way
  // CRON_SECRET is: the ingest route fails closed when it is unset, so local dev and CI
  // boot without it while prod must set it.
  CMS_INGEST_SECRET: z.string().optional(),
  // Landing rebuilds are dispatched to GitHub Actions; without a token the API logs a
  // warning and skips the dispatch instead of failing the publish that triggered it.
  GITHUB_REBUILD_TOKEN: z.string().optional(),
  GITHUB_REPO: z.string().default("Duckinm/mana-community"),

  TRIAGE_AUTH_DISABLED: z.string().optional(),

  AI_CAP_DISABLED: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_SOLO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_SOLO_ANNUAL: z.string().optional(),
  STRIPE_PRICE_PRO_MONTHLY: z.string().optional(),
  STRIPE_PRICE_PRO_ANNUAL: z.string().optional(),

  FLY_API_TOKEN: z.string().optional(),
  FLY_APP_NAME: z.string().optional(),

  NEON_API_KEY: z.string().optional(),
  NEON_PROJECT_ID: z.string().optional(),

  THUNDER_API_KEY: z.string().optional(),

  // LINE Messaging API (Official Account push notifications) — feature degrades to
  // not configured until all three are set; never required for local dev.
  LINE_CHANNEL_ACCESS_TOKEN: z.string().optional(),
  LINE_CHANNEL_SECRET: z.string().optional(),
  LINE_OA_ID: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
}).refine((config) => config.R2_ENDPOINT || config.CLOUDFLARE_ACCOUNT_ID, {
  message: "Set R2_ENDPOINT for S3-compatible storage or CLOUDFLARE_ACCOUNT_ID for R2",
  path: ["R2_ENDPOINT"],
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = result.data;
