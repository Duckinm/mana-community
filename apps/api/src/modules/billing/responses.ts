import { t } from 'elysia'

export const CheckoutSessionResponse = t.Object({
  url: t.String(),
})

export const PortalSessionResponse = t.Object({
  url: t.String(),
})

const UsageBucket = t.Object({
  enabled: t.Boolean(),
  used: t.Number(),
  cap: t.Number(),
  bonusRemaining: t.Number(),
  inputTokens: t.Number(),
  outputTokens: t.Number(),
  costUsd: t.Number(),
})

const PlanLiteral = t.Union([t.Literal('free'), t.Literal('mana'), t.Literal('aether')])

export const PlanChangeImpactResponse = t.Object({
  plan: PlanLiteral,
  projects: t.Object({
    used: t.Number(),
    cap: t.Union([t.Number(), t.Null()]),
    toArchive: t.Number(),
    planArchived: t.Number(),
    restorable: t.Number(),
  }),
  ai: t.Object({ used: t.Number(), cap: t.Number() }),
  docsSent: t.Object({ used: t.Number(), cap: t.Union([t.Number(), t.Null()]) }),
  storage: t.Object({
    usedBytes: t.Number(),
    capBytes: t.Union([t.Number(), t.Null()]),
    overBytes: t.Number(),
  }),
  calendarSync: t.Object({ connected: t.Boolean(), allowed: t.Boolean() }),
})

export const UsageResponse = t.Object({
  ai: UsageBucket,
  projects: t.Object({
    used: t.Number(),
    cap: t.Union([t.Number(), t.Null()]),
  }),
  slipVerify: t.Object({ used: t.Number(), cap: t.Union([t.Number(), t.Null()]) }),
  docsSent: t.Object({ used: t.Number(), cap: t.Union([t.Number(), t.Null()]) }),
  storage: t.Object({ usedBytes: t.Number(), capBytes: t.Union([t.Number(), t.Null()]) }),
  lastUsedAt: t.Union([t.String(), t.Null()]),
  resetAt: t.String(),
})

export const DailyUsageResponse = t.Object({
  days: t.Array(
    t.Object({
      day: t.String(),
      count: t.Number(),
      inputTokens: t.Number(),
      outputTokens: t.Number(),
    }),
  ),
})

const InvoiceSummary = t.Object({
  id: t.String(),
  date: t.String(),
  total: t.Number(),
  currency: t.String(),
  status: t.String(),
  hostedInvoiceUrl: t.Union([t.String(), t.Null()]),
})

export const InvoiceListResponse = t.Array(InvoiceSummary)

export const PlanChangePreviewResponse = t.Object({
  mode: t.Union([t.Literal('immediate'), t.Literal('scheduled')]),
  lines: t.Array(t.Object({ description: t.String(), amount: t.Number() })),
  subtotal: t.Number(),
  tax: t.Number(),
  total: t.Number(),
  currency: t.String(),
  effectiveAt: t.Union([t.String(), t.Null()]),
  nextAmount: t.Union([t.Number(), t.Null()]),
  prorationDate: t.Union([t.Number(), t.Null()]),
})

export const ChangePlanResponse = t.Object({
  success: t.Boolean(),
  status: t.Union([
    t.Literal('applied'),
    t.Literal('scheduled'),
    t.Literal('payment_required'),
  ]),
  effectiveAt: t.Union([t.String(), t.Null()]),
  paymentUrl: t.Union([t.String(), t.Null()]),
})

const BillingPrice = t.Object({
  plan: t.Union([t.Literal('mana'), t.Literal('aether')]),
  interval: t.Union([t.Literal('monthly'), t.Literal('annual')]),
  amount: t.Number(),
  currency: t.String(),
})

const PendingPlanChange = t.Object({
  plan: t.Union([t.Literal('mana'), t.Literal('aether')]),
  interval: t.Union([t.Literal('monthly'), t.Literal('annual')]),
  effectiveAt: t.String(),
  manageable: t.Boolean(),
})

export const BillingOverviewResponse = t.Object({
  prices: t.Array(BillingPrice),
  subscription: t.Union([
    t.Object({
      id: t.String(),
      plan: t.Union([t.Literal('mana'), t.Literal('aether'), t.Null()]),
      interval: t.Union([
        t.Literal('monthly'),
        t.Literal('annual'),
        t.Null(),
      ]),
      status: t.String(),
      currentPeriodEnd: t.Union([t.String(), t.Null()]),
      cancelAtPeriodEnd: t.Boolean(),
      pendingChange: t.Union([PendingPlanChange, t.Null()]),
      paymentPending: t.Boolean(),
      paymentUrl: t.Union([t.String(), t.Null()]),
    }),
    t.Null(),
  ]),
})

export const SuccessResponse = t.Object({ success: t.Boolean() })
export const RestoreProjectsResponse = t.Object({ restored: t.Number() })
export const CheckoutStatusResponse = t.Object({ complete: t.Boolean() })
