import { t } from 'elysia'
import { IsoInstant } from '@api/lib/wire-schema'

export const HealthResponse = t.Object({
  status: t.Literal('ok'),
  uptime: t.Number(),
  timestamp: IsoInstant,
  aiProvider: t.String(),
  aiModel: t.String(),
})

export const DegradedHealthResponse = t.Object({
  status: t.Literal('degraded'),
})
