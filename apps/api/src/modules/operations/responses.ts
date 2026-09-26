import { t } from 'elysia'

const ProviderState = t.Union([
  t.Literal('ready'),
  t.Literal('degraded'),
  t.Literal('unavailable'),
  t.Literal('unconfigured'),
])

const ProviderFields = {
  state: ProviderState,
  dashboardUrl: t.Union([t.String(), t.Null()]),
  error: t.Union([t.String(), t.Null()]),
}

const CurrencyAmount = t.Object({
  currency: t.String(),
  amount: t.Number(),
})

export const UsersActivityResponse = t.Object({
  users: t.Array(t.Object({
    userId: t.String(),
    lastActiveAt: t.Union([t.String(), t.Null()]),
  })),
})

export const OperationsOverviewResponse = t.Object({
  generatedAt: t.String(),
  stripe: t.Object({
    ...ProviderFields,
    livemode: t.Union([t.Boolean(), t.Null()]),
    balance: t.Object({
      available: t.Array(CurrencyAmount),
      pending: t.Array(CurrencyAmount),
    }),
    subscriptions: t.Object({
      active: t.Number(),
      trialing: t.Number(),
      pastDue: t.Number(),
      other: t.Number(),
      hasMore: t.Boolean(),
    }),
    paymentsLast30Days: t.Object({
      succeeded: t.Number(),
      failed: t.Number(),
      volume: t.Array(CurrencyAmount),
      hasMore: t.Boolean(),
    }),
  }),
  fly: t.Object({
    ...ProviderFields,
    appName: t.Union([t.String(), t.Null()]),
    machines: t.Array(t.Object({
      id: t.String(),
      name: t.String(),
      state: t.String(),
      region: t.String(),
      updatedAt: t.String(),
    })),
  }),
  neon: t.Object({
    ...ProviderFields,
    project: t.Union([
      t.Object({
        id: t.String(),
        name: t.String(),
        regionId: t.String(),
        pgVersion: t.Number(),
        historyRetentionSeconds: t.Number(),
        createdAt: t.String(),
        updatedAt: t.String(),
      }),
      t.Null(),
    ]),
    branches: t.Array(t.Object({
      id: t.String(),
      name: t.String(),
      state: t.String(),
      primary: t.Boolean(),
      updatedAt: t.String(),
    })),
    databases: t.Array(t.Object({
      id: t.Number(),
      name: t.String(),
      branchId: t.String(),
    })),
    endpoints: t.Array(t.Object({
      id: t.String(),
      branchId: t.String(),
      state: t.String(),
      type: t.String(),
      regionId: t.String(),
      updatedAt: t.String(),
    })),
    restore: t.Object({
      available: t.Boolean(),
      mode: t.Literal('console'),
      url: t.Union([t.String(), t.Null()]),
    }),
  }),
  thunder: t.Object({
    ...ProviderFields,
    branchName: t.Union([t.String(), t.Null()]),
    branchActive: t.Union([t.Boolean(), t.Null()]),
    accountEmail: t.Union([t.String(), t.Null()]),
    credit: t.Union([t.Number(), t.Null()]),
    product: t.Union([t.String(), t.Null()]),
    quotaUsed: t.Union([t.Number(), t.Null()]),
    quotaMax: t.Union([t.Number(), t.Null()]),
    quotaRemaining: t.Union([t.Number(), t.Null()]),
  }),
})
