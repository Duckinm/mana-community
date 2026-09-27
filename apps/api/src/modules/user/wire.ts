import type { users } from '@mana/db'
import { env } from '@api/env'
import { wireTimestamps, type WireTimestamps } from '@api/lib/wire-row'

type UserRow = typeof users.$inferSelect

const USER_TIMESTAMP_KEYS = [
  'createdAt',
  'updatedAt',
  'onboardedAt',
  'profileAiRewardClaimedAt',
  'mcpTokenRotatedAt',
  'currentPeriodEnd',
] as const satisfies readonly (keyof UserRow)[]

export type UserWire = WireTimestamps<UserRow, typeof USER_TIMESTAMP_KEYS[number]>

export function userToWire<T extends UserRow>(user: T) {
  const {
    plan, billingInterval, stripeCustomerId, stripeSubscriptionId,
    subscriptionStatus, currentPeriodEnd, cancelAtPeriodEnd, stripeEventAt,
    profileAiActionCredits, profileAiRewardClaimedAt, ...profile
  } = wireTimestamps(user, USER_TIMESTAMP_KEYS)
  return { ...profile, deploymentMode: env.DEPLOYMENT_MODE }
}
