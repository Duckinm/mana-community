import { t } from 'elysia'
import { IsoInstant, NullableString } from '@api/lib/wire-schema'

export const ActivityRowResponse = t.Object({
  id: t.String(),
  action: t.String(),
  summaryKey: t.String(),
  summaryParams: t.Union([t.Any(), t.Null()]),
  entityType: t.String(),
  entityId: t.String(),
  projectId: NullableString,
  metadata: t.Union([t.Any(), t.Null()]),
  createdAt: IsoInstant,
})

export const ActivityListResponse = t.Object({
  data: t.Array(ActivityRowResponse),
  total: t.Number(),
  limit: t.Number(),
  offset: t.Number(),
  hasMore: t.Boolean(),
})
