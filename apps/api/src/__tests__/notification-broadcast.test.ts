import { afterEach, describe, expect, it } from 'bun:test'
import { db } from '@api/db'
import { notifications, users } from '@mana/db'
import { eq, inArray } from 'drizzle-orm'
import { broadcastNotification } from '@api/modules/notifications/service'

const createdUserIds: string[] = []

async function createUser(banned = false) {
  const [user] = await db
    .insert(users)
    .values({ name: 'Broadcast User', email: `broadcast-${crypto.randomUUID()}@example.com`, banned })
    .returning()
  createdUserIds.push(user.id)
  return user
}

afterEach(async () => {
  if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds))
  createdUserIds.length = 0
})

describe('broadcastNotification', () => {
  it('inserts one notification per selected user and skips unselected ones', async () => {
    const [a, b, untouched] = [await createUser(), await createUser(), await createUser()]

    const result = await broadcastNotification({
      userIds: [a.id, b.id],
      title: 'Maintenance',
      body: 'Down on Sunday',
      link: '/settings',
    })

    expect(result.sent).toBe(2)
    const rows = await db.select().from(notifications).where(inArray(notifications.userId, [a.id, b.id, untouched.id]))
    expect(rows).toHaveLength(2)
    expect(rows[0].title).toBe('Maintenance')
    expect(rows[0].body).toBe('Down on Sunday')
    expect(rows[0].link).toBe('/settings')
    expect(rows[0].key).toBeNull()
  })

  it('skips banned users when targeting everyone', async () => {
    const recipient = await createUser()
    const banned = await createUser(true)
    const title = `all-hands-${crypto.randomUUID()}`

    const result = await broadcastNotification({ userIds: 'all', title, body: 'All hands' })

    expect(result.sent).toBeGreaterThanOrEqual(1)
    expect(await db.$count(notifications, eq(notifications.userId, recipient.id))).toBe(1)
    expect(await db.$count(notifications, eq(notifications.userId, banned.id))).toBe(0)
    await db.delete(notifications).where(eq(notifications.title, title))
  })

  it('sends nothing when every selected user is gone', async () => {
    expect(await broadcastNotification({ userIds: ['missing-user'], title: 'Hi', body: 'There' })).toEqual({ sent: 0 })
  })
})
