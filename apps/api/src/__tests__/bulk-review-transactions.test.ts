import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { transactions, users } from '@mana/db'
import { eq } from 'drizzle-orm'
import { bulkReviewTransactions, listTransactions } from '@api/modules/finance/service'

const createdUserIds: string[] = []

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com` })
    .returning()
  createdUserIds.push(user.id)
  return user
}

async function createTx(
  userId: string,
  source: 'manual' | 'ai_receipt',
  reviewedAt: Date | null,
) {
  const [row] = await db
    .insert(transactions)
    .values({
      userId,
      type: 'expense',
      amountCents: 56175,
      description: `tx-${source}`,
      category: 'Food',
      date: '2026-07-28',
      status: 'paid',
      source,
      reviewedAt,
    })
    .returning()
  return row
}

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

describe('bulkReviewTransactions', () => {
  it('accepts every pending AI draft when no ids are given', async () => {
    const user = await createUser()
    await createTx(user.id, 'ai_receipt', null)
    await createTx(user.id, 'ai_receipt', null)

    expect(await bulkReviewTransactions(user.id)).toEqual({ reviewed: 2 })
    expect(await bulkReviewTransactions(user.id)).toEqual({ reviewed: 0 })
  })

  it('leaves manual and already-reviewed rows alone', async () => {
    const user = await createUser()
    const manual = await createTx(user.id, 'manual', null)
    const done = await createTx(user.id, 'ai_receipt', new Date('2026-07-01'))
    await createTx(user.id, 'ai_receipt', null)

    expect(await bulkReviewTransactions(user.id)).toEqual({ reviewed: 1 })

    const [manualAfter] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, manual.id))
    expect(manualAfter.reviewedAt).toBeNull()

    const [doneAfter] = await db.select().from(transactions).where(eq(transactions.id, done.id))
    expect(doneAfter.reviewedAt?.toISOString()).toBe(new Date('2026-07-01').toISOString())
  })

  // An id list from another user's session must not stamp their rows.
  it('never touches another user\'s drafts', async () => {
    const mine = await createUser()
    const theirs = await createUser()
    const myTx = await createTx(mine.id, 'ai_receipt', null)
    const theirTx = await createTx(theirs.id, 'ai_receipt', null)

    expect(await bulkReviewTransactions(mine.id, [myTx.id, theirTx.id])).toEqual({ reviewed: 1 })

    const [theirAfter] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, theirTx.id))
    expect(theirAfter.reviewedAt).toBeNull()
  })

  it('is a no-op for an empty id list rather than approving everything', async () => {
    const user = await createUser()
    await createTx(user.id, 'ai_receipt', null)

    expect(await bulkReviewTransactions(user.id, [])).toEqual({ reviewed: 0 })
  })
})

describe('listTransactions needsReview filter', () => {
  it('returns only unreviewed AI drafts', async () => {
    const user = await createUser()
    const pending = await createTx(user.id, 'ai_receipt', null)
    await createTx(user.id, 'ai_receipt', new Date())
    await createTx(user.id, 'manual', null)

    const { data, total } = await listTransactions(user.id, { needsReview: true })

    expect(total).toBe(1)
    expect(data.map((tx) => tx.id)).toEqual([pending.id])
  })
})
