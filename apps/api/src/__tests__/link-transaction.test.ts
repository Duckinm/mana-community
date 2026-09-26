import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { users, documents, transactions, contacts, activityLogs } from '@mana/db'
import { eq } from 'drizzle-orm'
import { reconcile } from '@api/modules/reconciliation/service'
import { getDocument } from '@api/modules/documents/service'
import { getTransaction, listTransactions } from '@api/modules/finance/service'
import { ConflictError, NotFoundError } from '@api/lib/errors'

async function createUser() {
  const [user] = await db
    .insert(users)
    .values({ name: 'Test User', email: `test-${crypto.randomUUID()}@example.com` })
    .returning()
  return user
}

async function createDocument(userId: string, overrides: Partial<typeof documents.$inferInsert> = {}) {
  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      type: 'INV',
      status: 'published',
      number: 'INV-TEST-001',
      amountDueCents: 100000,
      totalCents: 100000,
      ...overrides,
    })
    .returning()
  return doc
}

async function createTransaction(userId: string, overrides: Partial<typeof transactions.$inferInsert> = {}) {
  const [tx] = await db
    .insert(transactions)
    .values({
      userId,
      type: 'revenue',
      amountCents: 100000,
      description: 'Test payment',
      date: '2026-06-01',
      status: 'paid',
      ...overrides,
    })
    .returning()
  return tx
}

const createdUserIds: string[] = []

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(activityLogs).where(eq(activityLogs.userId, userId))
    await db.delete(transactions).where(eq(transactions.userId, userId))
    await db.delete(documents).where(eq(documents.userId, userId))
    await db.delete(contacts).where(eq(contacts.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }
})

/**
 * These tests exercise the same logic as POST /api/documents/:id/link-transaction:
 * ownership checks via getDocument/getTransaction, then reconcile(), matching the
 * route handler in apps/api/src/modules/documents/index.ts.
 */
describe('POST /api/documents/:id/link-transaction (service-level)', () => {
  it('links an existing unlinked transaction to a document, marking it paid', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id, { date: '2026-06-05' })

    await getDocument(user.id, doc.id)
    const existingTx = await getTransaction(user.id, tx.id)
    expect(existingTx).not.toBeNull()

    const result = await reconcile(user.id, doc.id, tx.id)

    expect(result.document.status).toBe('published')
    expect(result.document.paidAt).toBe('2026-06-05')
    expect(result.transaction.documentId).toBe(doc.id)
    expect(result.warning).toBeUndefined()

    const refetchedDoc = await getDocument(user.id, doc.id)
    expect(refetchedDoc.status).toBe('published')
  })

  it('surfaces a non-blocking warning when the amount does not match amountDueCents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 75000 })

    const result = await reconcile(user.id, doc.id, tx.id)

    expect(result.warning).toBeDefined()
    expect(result.document.status).toBe('published')
    expect(result.transaction.documentId).toBe(doc.id)
  })

  it('rejects with a conflict when the transaction is already linked to a different document', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const docA = await createDocument(user.id, { number: 'INV-TEST-A' })
    const docB = await createDocument(user.id, { number: 'INV-TEST-B' })
    const tx = await createTransaction(user.id)

    await reconcile(user.id, docA.id, tx.id)

    await expect(reconcile(user.id, docB.id, tx.id)).rejects.toThrow(ConflictError)
  })

  it('rejects when the document does not belong to the user', async () => {
    const owner = await createUser()
    const other = await createUser()
    createdUserIds.push(owner.id, other.id)

    const doc = await createDocument(owner.id)

    await expect(getDocument(other.id, doc.id)).rejects.toThrow(NotFoundError)
  })

  it('returns null when the transaction does not belong to the user', async () => {
    const owner = await createUser()
    const other = await createUser()
    createdUserIds.push(owner.id, other.id)

    const tx = await createTransaction(owner.id)

    const result = await getTransaction(other.id, tx.id)
    expect(result).toBeNull()
  })
})

describe('listTransactions unlinked filter (picker source)', () => {
  it('returns only revenue transactions with documentId null', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const linkedRevenue = await createTransaction(user.id, { description: 'Linked revenue', documentId: doc.id })
    const unlinkedRevenue = await createTransaction(user.id, { description: 'Unlinked revenue' })
    const unlinkedExpense = await createTransaction(user.id, { description: 'Unlinked expense', type: 'expense' })

    const result = await listTransactions(user.id, { unlinked: true, type: 'revenue', limit: 100 })
    const ids = result.data.map((t) => t.id)

    expect(ids).toContain(unlinkedRevenue.id)
    expect(ids).not.toContain(linkedRevenue.id)
    expect(ids).not.toContain(unlinkedExpense.id)
  })

  it('reflects a transaction as linked after reconcile', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id)

    let result = await listTransactions(user.id, { unlinked: true, type: 'revenue', limit: 100 })
    expect(result.data.map((t) => t.id)).toContain(tx.id)

    await reconcile(user.id, doc.id, tx.id)

    result = await listTransactions(user.id, { unlinked: true, type: 'revenue', limit: 100 })
    expect(result.data.map((t) => t.id)).not.toContain(tx.id)
  })
})
