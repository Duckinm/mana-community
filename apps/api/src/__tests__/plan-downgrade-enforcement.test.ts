import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { emailLogs, projects, storageFiles, users } from '@mana/db'
import { STORAGE_CAPS_BYTES } from '@mana/db/plan-entitlements'
import { eq, inArray } from 'drizzle-orm'
import {
  countPlanArchivedProjects,
  reconcileProjectCap,
  restorePlanArchivedProjects,
} from '@api/modules/billing/entitlements'
import { countDocumentsSentThisMonth, sendDocumentEmail } from '@api/modules/documents/send-email'
import { documents } from '@mana/db'
import { calendarSyncAllowed } from '@api/modules/calendar/connection'
import { getStorageQuota } from '@api/modules/storage/service'
import { getPlanChangeImpact } from '@api/modules/billing/plan-impact'

const createdUserIds: string[] = []

async function createUser(plan: string = 'free') {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com`, plan })
    .returning()
  createdUserIds.push(user.id)
  return user
}

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(emailLogs).where(eq(emailLogs.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(storageFiles).where(eq(storageFiles.userId, userId))
    await db.delete(projects).where(eq(projects.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('reconcileProjectCap', () => {
  it('archives least-recently-updated projects over the cap and marks planArchivedAt', async () => {
    const user = await createUser('free')
    const base = Date.now()
    const rows = await db
      .insert(projects)
      .values(
        ['oldest', 'middle', 'newest'].map((name, i) => ({
          userId: user.id,
          name,
          updatedAt: new Date(base + i * 1000),
        })),
      )
      .returning()

    const archived = await reconcileProjectCap(user.id, 'free')
    expect(archived).toBe(2)

    const after = await db
      .select()
      .from(projects)
      .where(inArray(projects.id, rows.map((r) => r.id)))
    const byName = Object.fromEntries(after.map((p) => [p.name, p]))
    expect(byName.newest.archived).toBe(false)
    expect(byName.newest.planArchivedAt).toBeNull()
    expect(byName.oldest.archived).toBe(true)
    expect(byName.oldest.planArchivedAt).not.toBeNull()
    expect(byName.middle.archived).toBe(true)

    expect(await countPlanArchivedProjects(user.id)).toBe(2)

    expect(await reconcileProjectCap(user.id, 'free')).toBe(0)
    expect(await reconcileProjectCap(user.id, 'aether')).toBe(0)
  })
})

describe('restorePlanArchivedProjects', () => {
  it('unarchives only what the current plan has room for', async () => {
    const user = await createUser('free')
    const base = Date.now()
    await db.insert(projects).values(
      ['oldest', 'middle', 'newest'].map((name, i) => ({
        userId: user.id,
        name,
        updatedAt: new Date(base + i * 1000),
      })),
    )
    await reconcileProjectCap(user.id, 'free')

    expect(await restorePlanArchivedProjects(user.id, 'free')).toBe(0)
    expect(await countPlanArchivedProjects(user.id)).toBe(2)

    expect(await restorePlanArchivedProjects(user.id, 'mana')).toBe(2)
    expect(await countPlanArchivedProjects(user.id)).toBe(0)

    const after = await db.select().from(projects).where(eq(projects.userId, user.id))
    expect(after.every((p) => !p.archived && p.planArchivedAt === null)).toBe(true)
    expect(await restorePlanArchivedProjects(user.id, 'aether')).toBe(0)
  })
})

describe('document send plan cap', () => {
  it('blocks the 11th send of the month on Free and reports exact used/cap', async () => {
    const user = await createUser('free')
    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        type: 'INV',
        status: 'published',
        number: 'INV-CAP-001',
        clientEmail: 'billing@acme.com',
        clientName: 'Acme Co',
      })
      .returning()
    await db.insert(emailLogs).values(
      Array.from({ length: 10 }, (_, i) => ({
        userId: user.id,
        recipient: 'billing@acme.com',
        subject: `doc ${i}`,
        type: 'document_sent',
        status: 'sent',
      })),
    )

    expect(await countDocumentsSentThisMonth(user.id)).toBe(10)

    const result = await sendDocumentEmail(user.id, doc.id)
    expect(result).toEqual({ status: 'plan_limit', sentAt: null, used: 10, cap: 10 })
  })

  it('ignores failed sends and non-document email types in the count', async () => {
    const user = await createUser('free')
    await db.insert(emailLogs).values([
      { userId: user.id, recipient: 'a@b.c', subject: 'x', type: 'document_sent', status: 'failed' },
      { userId: user.id, recipient: 'a@b.c', subject: 'x', type: 'reminder', status: 'sent' },
    ])
    expect(await countDocumentsSentThisMonth(user.id)).toBe(0)
  })
})

describe('plan-based storage quota', () => {
  it('returns the cap for the user plan', async () => {
    const user = await createUser('free')
    expect((await getStorageQuota(user.id)).limitBytes).toBe(STORAGE_CAPS_BYTES.free)

    await db.update(users).set({ plan: 'aether' }).where(eq(users.id, user.id))
    expect((await getStorageQuota(user.id)).limitBytes).toBe(STORAGE_CAPS_BYTES.aether)
  })

  it('previews the target plan storage cap when a paid account downgrades', async () => {
    const user = await createUser('aether')
    const usedBytes = STORAGE_CAPS_BYTES.free + 1
    await db.insert(storageFiles).values({
      userId: user.id,
      name: 'Downgrade quota metadata',
      kind: 'other',
      sizeBytes: usedBytes,
      mimeType: 'application/octet-stream',
      r2Key: `downgrade-test/${user.id}`,
    })

    expect((await getStorageQuota(user.id)).limitBytes).toBe(STORAGE_CAPS_BYTES.aether)
    const impact = await getPlanChangeImpact(user.id, 'free')
    expect(impact.storage).toEqual({
      usedBytes,
      capBytes: STORAGE_CAPS_BYTES.free,
      overBytes: 1,
    })
  })
})

describe('calendar sync entitlement', () => {
  it('allows free and paid plans alike', async () => {
    const user = await createUser('free')
    expect(await calendarSyncAllowed(user.id)).toBe(true)

    await db.update(users).set({ plan: 'mana' }).where(eq(users.id, user.id))
    expect(await calendarSyncAllowed(user.id)).toBe(true)
  })
})
