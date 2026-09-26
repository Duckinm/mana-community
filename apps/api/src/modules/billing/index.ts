import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { changePlan, confirmCheckoutSession, createCheckoutSession, createPortalSession, getBillingOverview, getUserPlan, isStripeConfigured, listInvoices, previewPlanChange, restoreSubscriptionChange } from '@api/modules/billing/service'
import { getCurrentMonthUsage, getDailyAiUsage } from '@api/modules/billing/usage'
import { getPlanChangeImpact } from '@api/modules/billing/plan-impact'
import { BillingOverviewResponse, ChangePlanResponse, CheckoutSessionResponse, CheckoutStatusResponse, DailyUsageResponse, InvoiceListResponse, PlanChangeImpactResponse, PlanChangePreviewResponse, PortalSessionResponse, RestoreProjectsResponse, SuccessResponse, UsageResponse } from '@api/modules/billing/responses'
import { restorePlanArchivedProjects } from '@api/modules/billing/entitlements'
import { ErrorResponse } from '@api/lib/wire-schema'
import { auth } from '@api/auth'

export const billingModule = new Elysia({ name: 'billing', prefix: '/api/billing' })
  .use(betterAuthPlugin)

  .get('/usage', async ({ user, status }) => {
    const plan = await getUserPlan(user.id)
    if (!plan) return status(404, { error: 'User not found' })
    return getCurrentMonthUsage(user.id, plan)
  }, {
    auth: true,
    response: { 200: UsageResponse, 404: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Get current-month AI Action usage vs. plan caps' },
  })

  .get('/usage/daily', async ({ user }) => {
    return getDailyAiUsage(user.id)
  }, {
    auth: true,
    response: { 200: DailyUsageResponse },
    detail: { tags: ['Billing'], summary: 'Get daily AI Action usage for the last 365 UTC days (usage heatmap)' },
  })

  .get('/plan-change-impact', async ({ user, query }) => {
    return getPlanChangeImpact(user.id, query.plan)
  }, {
    auth: true,
    query: t.Object({ plan: t.Union([t.Literal('free'), t.Literal('mana'), t.Literal('aether')]) }),
    response: { 200: PlanChangeImpactResponse },
    detail: { tags: ['Billing'], summary: 'Compare current usage against a target plan\'s caps (downgrade warning + post-downgrade notice)' },
  })

  .get('/overview', async ({ user, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    return getBillingOverview(user.id)
  }, {
    auth: true,
    response: { 200: BillingOverviewResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Get Stripe-owned prices, current subscription, and pending change' },
  })

  .post('/checkout-session', async ({ user, body, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    const url = await createCheckoutSession(user.id, body.plan, body.interval, body.idempotencyKey)
    return { url }
  }, {
    auth: true,
    body: t.Object({
      plan: t.Union([t.Literal('mana'), t.Literal('aether')]),
      interval: t.Union([t.Literal('monthly'), t.Literal('annual')]),
      idempotencyKey: t.String(),
    }),
    response: { 200: CheckoutSessionResponse, 400: ErrorResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Create a Stripe Checkout session for a plan upgrade' },
  })

  .get('/checkout-status', async ({ user, query }) => {
    return confirmCheckoutSession(user.id, query.sessionId)
  }, {
    auth: true,
    query: t.Object({ sessionId: t.String() }),
    response: { 200: CheckoutStatusResponse, 404: ErrorResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Verify Checkout completion and reconcile the user projection from Stripe' },
  })

  .post('/preview-plan-change', async ({ user, body, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    return previewPlanChange(user.id, body.plan, body.interval)
  }, {
    auth: true,
    body: t.Object({
      plan: t.Union([t.Literal('mana'), t.Literal('aether')]),
      interval: t.Union([t.Literal('monthly'), t.Literal('annual')]),
    }),
    response: { 200: PlanChangePreviewResponse, 400: ErrorResponse, 409: ErrorResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Preview the timing and cost of switching plan/interval for an existing subscription' },
  })

  .post('/change-plan', async ({ user, body, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    return changePlan(user.id, body.plan, body.interval, body.idempotencyKey, body.prorationDate)
  }, {
    auth: true,
    body: t.Object({
      plan: t.Union([t.Literal('mana'), t.Literal('aether')]),
      interval: t.Union([t.Literal('monthly'), t.Literal('annual')]),
      idempotencyKey: t.String(),
      prorationDate: t.Optional(t.Number()),
    }),
    response: { 200: ChangePlanResponse, 400: ErrorResponse, 409: ErrorResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Switch an existing subscription now or schedule a downgrade at renewal' },
  })

  .post('/restore', async ({ user, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    return restoreSubscriptionChange(user.id)
  }, {
    auth: true,
    response: { 200: SuccessResponse, 400: ErrorResponse, 409: ErrorResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Restore a pending cancellation or scheduled plan change' },
  })

  .post('/restore-projects', async ({ user, status }) => {
    const plan = await getUserPlan(user.id)
    if (!plan) return status(404, { error: 'User not found' })
    return { restored: await restorePlanArchivedProjects(user.id, plan) }
  }, {
    auth: true,
    response: { 200: RestoreProjectsResponse, 404: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Unarchive downgrade-archived projects that fit under the current plan cap' },
  })

  .post('/portal-session', async ({ user, body, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    const url = await createPortalSession(user.id, body?.flow)
    return { url }
  }, {
    auth: true,
    body: t.Optional(t.Object({ flow: t.Optional(t.Literal('cancel')) })),
    response: { 200: PortalSessionResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'Create a Stripe Customer Portal session, optionally deep-linked to the cancellation flow' },
  })

  .get('/invoices', async ({ user, status }) => {
    if (!isStripeConfigured()) {
      return status(501, { error: 'Billing is not configured yet' })
    }
    return listInvoices(user.id)
  }, {
    auth: true,
    response: { 200: InvoiceListResponse, 501: ErrorResponse },
    detail: { tags: ['Billing'], summary: 'List the current user\'s Stripe invoice history' },
  })

  .post('/webhook', ({ request }) => {
    const url = new URL(request.url)
    url.pathname = '/api/auth/stripe/webhook'
    return auth.handler(new Request(url, request))
  }, {
    detail: { tags: ['Billing'], summary: 'Stripe webhook receiver' },
  })
