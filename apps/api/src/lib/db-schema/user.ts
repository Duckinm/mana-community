import { createSelectSchema, createUpdateSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { NOTIFICATION_PREFERENCE_KEYS, users } from '@mana/db'
import { IsoInstant, NullableIsoInstant } from '@api/lib/wire-schema'

const Region = t.Union([t.Literal('TH'), t.Literal('US')])
const DateFormat = t.Union([
  t.Literal('regional'),
  t.Literal('dmy'),
  t.Literal('mdy'),
])
const TimeFormat = t.Union([
  t.Literal('regional'),
  t.Literal('h12'),
  t.Literal('h24'),
])
const NotificationPreferences = t.Object(
  Object.fromEntries(NOTIFICATION_PREFERENCE_KEYS.map((key) => [key, t.Optional(t.Boolean())])),
  { additionalProperties: false },
)

const _userSelect = createSelectSchema(users, {
  disabledAiTools: t.Array(t.String()),
  disabledExternalMcpTools: t.Array(t.String()),
  notificationPreferences: NotificationPreferences,
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
  onboardedAt: NullableIsoInstant,
  profileAiRewardClaimedAt: NullableIsoInstant,
  mcpTokenRotatedAt: NullableIsoInstant,
  currentPeriodEnd: NullableIsoInstant,
  region: t.Union([Region, t.Null()]),
  dateFormat: DateFormat,
  timeFormat: TimeFormat,
})
export const UserResponse = t.Composite([t.Omit(_userSelect, [
  'role',
  'stripeCustomerId',
  'stripeSubscriptionId',
]), t.Object({ deploymentMode: t.Union([t.Literal('cloud'), t.Literal('self-hosted')]) })])

const _userUpdate = createUpdateSchema(users, {
  disabledAiTools: t.Optional(t.Array(t.String())),
  disabledExternalMcpTools: t.Optional(t.Array(t.String())),
  notificationPreferences: t.Optional(NotificationPreferences),
  onboardedAt: t.Optional(t.Union([t.String(), t.Null()])),
  region: t.Optional(Region),
  dateFormat: t.Optional(DateFormat),
  timeFormat: t.Optional(TimeFormat),
})
export const UpdateUserBody = t.Omit(_userUpdate, [
  'id',
  'email',
  'emailVerified',
  'role',
  'createdAt',
  'updatedAt',
  'mcpToken',
  'mcpTokenRotatedAt',
  'profileAiActionCredits',
  'profileAiRewardClaimedAt',
  'plan',
  'billingInterval',
  'stripeCustomerId',
  'stripeSubscriptionId',
  'subscriptionStatus',
  'currentPeriodEnd',
  'cancelAtPeriodEnd',
])
