import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { users, documents, transactions, contacts, activityLogs, notifications } from '@mana/db'
import { eq } from 'drizzle-orm'
import { reconcile, unreconcile, resyncReconciliation } from '@api/modules/reconciliation/service'
import { patchTransaction, createTransaction as createTransactionViaApi } from '@api/modules/finance/service'

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

describe('createTransaction with documentId', () => {
  it('links the payment to its invoice at entry time', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransactionViaApi(user.id, {
      type: 'revenue',
      amount: 1000,
      description: 'Invoice payment',
      category: '',
      date: '2026-06-05',
      status: 'received',
      documentId: doc.id,
    })

    expect(tx.documentId).toBe(doc.id)

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBe(doc.id)

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.paidAt).toBe('2026-06-05')
  })

  it('leaves the transaction unlinked when no documentId is given', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const tx = await createTransactionViaApi(user.id, {
      type: 'expense',
      amount: 22,
      description: 'Coffee',
      category: 'food',
      date: '2026-06-05',
      status: 'paid',
    })

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBeNull()
  })
})

describe('reconcile', () => {
  it('links a transaction to a published document, marking it paid', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id, { date: '2026-06-05' })

    const result = await reconcile(user.id, doc.id, tx.id)

    expect(result.document.status).toBe('published')
    expect(result.document.paidAt).toBe('2026-06-05')
    expect(result.transaction.documentId).toBe(doc.id)

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.status).toBe('published')
    expect(refetchedDoc.paidAt).toBe('2026-06-05')

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBe(doc.id)
  })

  it('does not overwrite paidAt if already set on the document', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { paidAt: '2026-05-20' })
    const tx = await createTransaction(user.id, { date: '2026-06-05' })

    const result = await reconcile(user.id, doc.id, tx.id)

    expect(result.document.paidAt).toBe('2026-05-20')
  })

  it('returns a warning but still links when the amount does not match amountDueCents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 50000 })

    const result = await reconcile(user.id, doc.id, tx.id)

    expect(result.warning).toBeDefined()
    expect(result.document.status).toBe('published')
    expect(result.transaction.documentId).toBe(doc.id)

    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
    expect(notification.link).toBe(`/accounting/transactions?txId=${tx.id}`)
  })

  it('rejects when the transaction is already linked to a different document', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const docA = await createDocument(user.id, { number: 'INV-TEST-A' })
    const docB = await createDocument(user.id, { number: 'INV-TEST-B' })
    const tx = await createTransaction(user.id)

    await reconcile(user.id, docA.id, tx.id)

    await expect(reconcile(user.id, docB.id, tx.id)).rejects.toThrow()
  })
})

describe('unreconcile', () => {
  it('clears documentId and paidAt, keeping the document published', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id)
    await reconcile(user.id, doc.id, tx.id)

    const result = await unreconcile(user.id, tx.id)

    expect(result.transaction.documentId).toBeNull()
    expect(result.document?.status).toBe('published')
    expect(result.document?.paidAt).toBeNull()

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.status).toBe('published')
    expect(refetchedDoc.paidAt).toBeNull()

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBeNull()
  })

  it('is a safe no-op on document status when the document has no paidAt', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { status: 'published', deletedAt: new Date() })
    const tx = await createTransaction(user.id, { documentId: doc.id })

    const result = await unreconcile(user.id, tx.id)

    expect(result.transaction.documentId).toBeNull()
    expect(result.document?.status).toBe('published')

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.status).toBe('published')
  })
})

describe('patchTransaction documentId field', () => {
  it('linking via documentId reconciles the document and sets paidAt', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id)

    await patchTransaction(user.id, tx.id, { documentId: doc.id })

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.status).toBe('published')

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBe(doc.id)
  })

  it('clearing documentId to null unreconciles and reverts the document to published', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id)
    await reconcile(user.id, doc.id, tx.id)

    await patchTransaction(user.id, tx.id, { documentId: null })

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.status).toBe('published')

    const [refetchedTx] = await db.select().from(transactions).where(eq(transactions.id, tx.id))
    expect(refetchedTx.documentId).toBeNull()
  })
})

describe('resyncReconciliation', () => {
  it('updates the linked document paidAt when the transaction date changes', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id, { date: '2026-06-05' })
    const { transaction: linkedTx } = await reconcile(user.id, doc.id, tx.id)

    const updatedTx = { ...linkedTx, date: '2026-06-10' }

    await resyncReconciliation(user.id, linkedTx, updatedTx)

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.paidAt).toBe('2026-06-10')
  })

  it('returns a warning when the edited amount no longer matches amountDueCents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 100000 })
    const { transaction: linkedTx } = await reconcile(user.id, doc.id, tx.id)

    const updatedTx = { ...linkedTx, amountCents: 50000 }

    const result = await resyncReconciliation(user.id, linkedTx, updatedTx)

    expect(result.warning).toBeDefined()

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.amountDueCents).toBe(100000)
  })

  it('returns no warning when the edited amount still matches amountDueCents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 90000 })
    const { transaction: linkedTx } = await reconcile(user.id, doc.id, tx.id)

    const updatedTx = { ...linkedTx, amountCents: 100000 }

    const result = await resyncReconciliation(user.id, linkedTx, updatedTx)

    expect(result.warning).toBeUndefined()
  })

  it('is a no-op when neither date nor amount changed', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000, paidAt: '2026-06-05' })
    const tx = await createTransaction(user.id, { date: '2026-06-05', amountCents: 100000 })
    const { transaction: linkedTx } = await reconcile(user.id, doc.id, tx.id)

    const updatedTx = { ...linkedTx, description: 'Updated description' }

    const result = await resyncReconciliation(user.id, linkedTx, updatedTx)

    expect(result.warning).toBeUndefined()

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.paidAt).toBe('2026-06-05')
    expect(refetchedDoc.amountDueCents).toBe(100000)
  })

  it('is a no-op when the transaction is not linked to a document', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const tx = await createTransaction(user.id, { date: '2026-06-05', amountCents: 100000 })

    const updatedTx = { ...tx, date: '2026-06-10', amountCents: 50000 }

    const result = await resyncReconciliation(user.id, tx, updatedTx)

    expect(result.warning).toBeUndefined()
  })
})

describe('patchTransaction resync', () => {
  it('updates the linked document paidAt when the transaction date is edited', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id, { date: '2026-06-05' })
    await reconcile(user.id, doc.id, tx.id)

    await patchTransaction(user.id, tx.id, { date: '2026-06-12' })

    const [refetchedDoc] = await db.select().from(documents).where(eq(documents.id, doc.id))
    expect(refetchedDoc.paidAt).toBe('2026-06-12')
  })

  it('surfaces a warning when the edited amount no longer matches amountDueCents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 100000 })
    await reconcile(user.id, doc.id, tx.id)

    const result = await patchTransaction(user.id, tx.id, { amount: 500 })

    expect(result?.warning).toBeDefined()
  })
})
