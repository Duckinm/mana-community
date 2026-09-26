import { describe, it, expect, afterAll } from 'bun:test'
import { db } from '@api/db'
import { users, documents } from '@mana/db'
import { eq } from 'drizzle-orm'
import { softDeleteDocument } from '@api/modules/documents/service'

const createdUserIds: string[] = []

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Archive Test', email: `archive-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

afterAll(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('softDeleteDocument', () => {
  it('archives a published document', async () => {
    const user = await createUser()
    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        type: 'INV',
        status: 'published',
        number: 'INV-ARCHIVE-001',
        amountDueCents: 100000,
        totalCents: 100000,
      })
      .returning()

    await softDeleteDocument(user.id, doc.id)

    const [archived] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(archived.deletedAt).not.toBeNull()
  })

  it('throws for a document owned by someone else', async () => {
    const owner = await createUser()
    const stranger = await createUser()
    const [doc] = await db
      .insert(documents)
      .values({
        userId: owner.id,
        type: 'QO',
        status: 'published',
        number: 'QO-ARCHIVE-001',
        amountDueCents: 1000,
        totalCents: 1000,
      })
      .returning()

    expect(softDeleteDocument(stranger.id, doc.id)).rejects.toThrow()
  })
})
