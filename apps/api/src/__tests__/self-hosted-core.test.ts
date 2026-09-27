import { afterEach, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { aiActionUsage, slipVerifyUsage, projects, storageFiles, users } from '@mana/db'
import { db } from '@api/db'
import { claimAiAction, claimSlipVerification, getCurrentMonthUsage, releaseAiAction } from '@api/modules/billing/usage'
import { getStorageQuota } from '@api/modules/storage/service'
import { createProject } from '@api/modules/projects/service'
import { getStartedStatus, getUser, updateUser } from '@api/modules/user/service'

let userId: string | undefined

afterEach(async () => {
  if (userId) await db.delete(users).where(eq(users.id, userId))
})

test('community users keep access above former subscription caps without consuming reward credits', async () => {
  const [user] = await db.insert(users).values({
    name: 'Community access test',
    email: `community-access-${crypto.randomUUID()}@example.test`,
    profileAiActionCredits: 5,
  }).returning()
  userId = user.id
  await db.insert(projects).values({ userId, name: 'First project' })
  const created = await createProject(userId, { name: 'Second project' })
  expect(created.name).toBe('Second project')
  await db.insert(storageFiles).values({
    userId, name: 'Quota metadata only', kind: 'other', sizeBytes: 1024 ** 3 + 1,
    mimeType: 'application/octet-stream', r2Key: `community-test/${userId}`,
  })
  const now = new Date()
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  await db.insert(aiActionUsage).values({ userId, yearMonth, bucket: 'ai', count: 1100 })
  await db.insert(slipVerifyUsage).values({ userId, yearMonth, count: 30 })
  await claimAiAction(userId)
  await claimSlipVerification(userId)
  const usage = await getCurrentMonthUsage(userId)
  expect(usage.ai.used).toBe(1101)
  expect(usage.ai.cap).toBeNull()
  expect(usage.slipVerify).toEqual({ used: 31, cap: null })
  expect(usage.projects).toEqual({ used: 2, cap: null })
  expect(usage.docsSent.cap).toBeNull()
  expect(usage.storage.capBytes).toBeNull()
  expect((await getStorageQuota(userId)).limitBytes).toBeNull()
  await releaseAiAction(userId, 'ai')
  expect((await getCurrentMonthUsage(userId)).ai.used).toBe(1100)
  await updateUser(userId, { freelancerType: 'Designer', hideBranding: true })
  expect((await getStartedStatus(userId)).hasProfile).toBe(true)
  const [stored] = await db.select().from(users).where(eq(users.id, userId))
  expect(stored.profileAiActionCredits).toBe(5)
  expect(stored.profileAiRewardClaimedAt).toBeNull()
  expect(stored.hideBranding).toBe(true)
  const account = await getUser(userId)
  expect(account).not.toHaveProperty('plan')
  expect(account).not.toHaveProperty('profileAiActionCredits')
  expect(account?.deploymentMode).toBe('self-hosted')
})
