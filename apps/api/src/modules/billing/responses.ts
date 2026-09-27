import { t } from 'elysia'

const UsageBucket = t.Object({
  enabled: t.Boolean(),
  used: t.Number(),
  cap: t.Null(),
  inputTokens: t.Number(),
  outputTokens: t.Number(),
  costUsd: t.Number(),
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
