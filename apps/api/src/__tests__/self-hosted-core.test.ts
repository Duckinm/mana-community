import { afterEach, expect, test } from 'bun:test'
import { eq } from 'drizzle-orm'
import { projects, storageFiles, users } from '@mana/db'
import { db } from '@api/db'
import { env } from '@api/env'
import { assertProjectCreateAllowed, reconcileProjectCap } from '@api/modules/billing/entitlements'
import { getCurrentMonthUsage } from '@api/modules/billing/usage'
import { assertStorageQuotaAvailable, getStorageQuota } from '@api/modules/storage/service'
import { getUser } from '@api/modules/user/service'

const initialMode = env.DEPLOYMENT_MODE
let userId: string | undefined

afterEach(async () => {
  env.DEPLOYMENT_MODE = initialMode
  if (userId) await db.delete(users).where(eq(users.id, userId))
})

test('self-hosted Free accounts retain core access beyond Cloud caps without changing their plan', async () => {
  const [user] = await db.insert(users).values({
    name: 'Self-hosted core test',
    email: `self-hosted-${crypto.randomUUID()}@example.test`,
  }).returning()
  userId = user.id
  await db.insert(projects).values([
    { userId, name: 'First project' },
    { userId, name: 'Second project' },
  ])
  await db.insert(storageFiles).values({
    userId,
    name: 'Quota metadata only',
    kind: 'other',
    sizeBytes: 1024 ** 3 + 1,
    mimeType: 'application/octet-stream',
    r2Key: `self-hosted-test/${userId}`,
  })

  env.DEPLOYMENT_MODE = 'cloud'
  await expect(assertProjectCreateAllowed(userId)).rejects.toThrow('PLAN_LIMIT_PROJECTS')
  await expect(assertStorageQuotaAvailable(userId, 1)).rejects.toThrow('QUOTA_EXCEEDED')

  env.DEPLOYMENT_MODE = 'self-hosted'
  await assertProjectCreateAllowed(userId)
  await assertStorageQuotaAvailable(userId, 1)
  expect(await reconcileProjectCap(userId, 'free')).toBe(0)
  expect((await getStorageQuota(userId)).limitBytes).toBeNull()
  const usage = await getCurrentMonthUsage(userId, 'free')
  expect(usage.projects).toEqual({ used: 2, cap: null })
  expect(usage.docsSent.cap).toBeNull()
  expect(usage.storage.capBytes).toBeNull()
  expect(usage.ai.enabled).toBe(Boolean(env.ANTHROPIC_API_KEY))
  const account = await getUser(userId)
  expect(account?.plan).toBe('free')
  expect(account?.deploymentMode).toBe('self-hosted')

  env.DEPLOYMENT_MODE = 'cloud'
  expect(await reconcileProjectCap(userId, 'free')).toBe(1)
})
