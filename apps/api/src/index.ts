import "./instrument";
import { env } from '@api/env'
import * as Sentry from "@sentry/bun";
import { cors } from "@elysiajs/cors";
import { fromTypes, openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { auth } from "@api/auth";
import { betterAuthPlugin } from "@api/lib/auth-plugin";
import { corsOrigin } from "@api/lib/cors-origins";
import { AppError } from "@api/lib/errors";
import { capabilitiesModule } from "@api/modules/capabilities";
import { healthModule } from "@api/modules/health/index";
import { userModule } from "@api/modules/user/index";
import { contactsModule } from "@api/modules/contacts/index";
import { financeModule } from "@api/modules/finance/index";
import { projectsModule } from "@api/modules/projects/index";
import { labelsModule } from "@api/modules/labels/index";
import { storageModule } from "@api/modules/storage/index";
import { remindersModule } from "@api/modules/reminders/index";
import { emailDeliveryModule } from "@api/modules/email-delivery";
import { chatModule } from "@api/modules/chat/index";
import { mcpModule } from "@api/modules/mcp/index";
import { aiModule } from "@api/modules/ai/index";
import { documentsModule } from "@api/modules/documents/index"
import { paymentSlipsModule } from "@api/modules/payment-slips/index";
import { activityModule } from "@api/modules/activity/index";
import { accountingModule } from "@api/modules/accounting/index";
import { budgetsModule } from "@api/modules/budgets/index";
import { businessModule } from "@api/modules/business/index";
import { devEmailTestModule } from "@api/modules/dev/email-test"
import { itemTemplatesModule } from "@api/modules/item-templates/index";
import { itemTemplateGroupsModule } from "@api/modules/item-template-groups/index";
import { walletsModule } from "@api/modules/wallets/index";
import { calendarModule } from "@api/modules/calendar/index";
import { calendarCronModule } from "@api/modules/calendar/cron";
import { lineModule } from "@api/modules/line/index";
import { feedbackModule } from "@api/modules/feedback/index";
import { feedbackCronModule } from "@api/modules/feedback/cron";
import { notificationsModule } from "@api/modules/notifications/index";
import { pushModule } from "@api/modules/push/index";
import { billingModule } from "@api/modules/billing/index";
import { transcriptionModule } from "@api/modules/transcription/index";
import { hitRateLimit, clientIp } from "@api/lib/rate-limiter";

// Better-auth is mounted as an opaque handler (see auth-plugin.ts), so these can't
// get a normal route-level beforeHandle — gate them by pathname at the request level.
const AUTH_RATE_LIMITED_PATHS = new Set([
  "/api/auth/sign-in/email",
  "/api/auth/sign-up/email",
  "/api/auth/request-password-reset",
]);

// Build the typed app without rate-limit — elysia-rate-limit collapses Eden Treaty
// inference to `any` across the web client. Apply the limiter only at listen time.
const appRoutes = new Elysia()
  .onError(({ error, code, status }) => {
    if (error instanceof AppError) {
      return status(error.statusCode, { message: error.message })
    }
    // bot probes and invalid bodies are expected client noise, not incidents
    if (code !== "NOT_FOUND" && code !== "VALIDATION" && code !== "PARSE") {
      Sentry.captureException(error);
    }
  })
  .use(
    cors({
      origin: corsOrigin,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Accept-Language"],
      // control panel reads its bearer session token from this response header
      exposeHeaders: ["set-auth-token"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  )
  .use(betterAuthPlugin)
  .use(capabilitiesModule)
  .use(healthModule)
  .use(userModule)
  .use(projectsModule)
  .use(labelsModule)
  .use(contactsModule)
  .use(financeModule)
  .use(storageModule)
  .use(remindersModule)
  .use(emailDeliveryModule)
  .use(chatModule)
  .use(mcpModule)
  .use(aiModule)
  .use(documentsModule)
  .use(paymentSlipsModule)
  .use(activityModule)
  .use(accountingModule)
  .use(budgetsModule)
  .use(businessModule)
  .use(devEmailTestModule)
  .use(itemTemplatesModule)
  .use(itemTemplateGroupsModule)
  .use(walletsModule)
  .use(calendarModule)
  .use(calendarCronModule)
  .use(lineModule)
  .use(feedbackModule)
  .use(feedbackCronModule)
  .use(notificationsModule)
  .use(pushModule)
  .use(billingModule)
  .use(transcriptionModule)
  .use(
    new Elysia()
      .guard({
        async beforeHandle({ request, status }) {
          const session = await auth.api.getSession({ headers: request.headers });
          if (!session || session.user.role !== "admin") {
            return status(401, { error: "Unauthorized" });
          }
        },
      })
      .use(
        openapi({
          references: fromTypes(),
          documentation: {
            info: {
              title: "MANA Internal API",
              version: "0.0.1",
              description: "Owner access only",
            },
            tags: [
              { name: "Projects", description: "Project and task management" },
              { name: "Contacts", description: "CRM contacts" },
              { name: "Finance", description: "Invoices and expenses" },
              { name: "Users", description: "User profile and settings" },
              { name: "Chat", description: "AI chat with tool use" },
              { name: "Storage", description: "File uploads via R2" },
              { name: "Health", description: "Health check" },
              { name: "Accounting", description: "Accounting summaries and recurring transactions" },
              { name: "Budgets", description: "Budget management" },
              { name: "Wallets", description: "User bank accounts, cards, and platform balances" },
              { name: "Billing", description: "Resource usage" },
              { name: "Transcription", description: "Voice input audio transcription" },
            ],
          },
        }),
      ),
  );

export type App = typeof appRoutes;
export const app = appRoutes;

// ponytail: in-memory store, per-instance — fine for the current single Fly machine,
// move to a shared store (Redis) if we scale to multiple instances.
// Applied after export so Eden Treaty keeps route types (plugin collapses inference).
appRoutes
  .use(
    rateLimit({
      duration: 60_000,
      max: 300,
      errorResponse: new Response(JSON.stringify({ message: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    }),
  )
  .onRequest(({ request, set }) => {
    if (request.method !== "POST") return;
    const { pathname } = new URL(request.url);
    if (!AUTH_RATE_LIMITED_PATHS.has(pathname)) return;
    if (!hitRateLimit(`auth:${pathname}:${clientIp(request)}`, 8, 60_000)) {
      set.status = 429;
      return { message: "Too many attempts — try again later" };
    }
  })
  // idleTimeout: chat SSE sends no bytes while an LLM round runs; Bun's default
  // (~30s) kills the connection mid-turn on slow local models (C-353).
  // maxRequestBodySize: above the largest legitimate upload (general file manager,
  // bounded by request size) — tighter per-route caps (payment
  // slips, transcription, base64 images) apply well below this ceiling.
  .listen({ port: env.PORT, idleTimeout: 255, maxRequestBodySize: 100 * 1024 * 1024 });

console.log(`MANA API running at http://localhost:${app.server?.port}`);
