import { t } from 'elysia'
import { NullableIsoInstant, NullableString } from '@api/lib/wire-schema'

export const LineConnectionResponse = t.Object({
  connected: t.Boolean(),
  displayName: NullableString,
  pending: t.Boolean(),
  addFriendUrl: NullableString,
  sendCodeUrl: NullableString,
  linkCode: NullableString,
  expiresAt: NullableIsoInstant,
  lineConfigured: t.Boolean(),
})
