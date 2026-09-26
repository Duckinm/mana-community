import { describe, it, expect, afterEach } from 'bun:test'
import { db } from '@api/db'
import { users, documents, transactions, contacts, activityLogs } from '@mana/db'
import { eq } from 'drizzle-orm'
import { documentHandlers } from '@api/utils/mcp-tools/documents'
import { todayCalendarDate, addCalendarDays } from '@mana/db/calendar-date'

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

describe('get_unpaid_invoices', () => {
  it('returns published and overdue documents, excluding paid/draft/archived', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const published = await createDocument(user.id, { number: 'INV-PUB', status: 'published' })
    const overdue = await createDocument(user.id, { number: 'INV-OVERDUE', status: 'overdue' })
    await createDocument(user.id, { number: 'INV-PAID', status: 'published', paidAt: '2026-06-01' })
    await createDocument(user.id, { number: 'INV-DRAFT', status: 'draft' })
    await createDocument(user.id, { number: 'INV-ARCHIVED', status: 'published', deletedAt: new Date() })

    const result = (await documentHandlers['get_unpaid_invoices'](user.id, {})) as Array<{ id: string; number: string }>

    const numbers = result.map((r) => r.number)
    expect(numbers).toContain(published.number)
    expect(numbers).toContain(overdue.number)
    expect(numbers).not.toContain('INV-PAID')
    expect(numbers).not.toContain('INV-DRAFT')
    expect(numbers).not.toContain('INV-ARCHIVED')
  })

  it('marks a published document past its due date as computed-overdue', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const pastDue = addCalendarDays(todayCalendarDate(), -5)
    const doc = await createDocument(user.id, { number: 'INV-PASTDUE', status: 'published', dueDate: pastDue })

    const result = (await documentHandlers['get_unpaid_invoices'](user.id, {})) as Array<{ number: string; isOverdue: boolean }>

    const entry = result.find((r) => r.number === doc.number)
    expect(entry).toBeDefined()
    expect(entry?.isOverdue).toBe(true)
  })
})

describe('get_overdue_invoices', () => {
  it('respects the threshold date and includes computed-overdue documents', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const pastDue = addCalendarDays(todayCalendarDate(), -10)
    const futureDue = addCalendarDays(todayCalendarDate(), 10)

    const overdueDoc = await createDocument(user.id, { number: 'INV-PAST', status: 'published', dueDate: pastDue })
    const futureDoc = await createDocument(user.id, { number: 'INV-FUTURE', status: 'published', dueDate: futureDue })

    const result = (await documentHandlers['get_overdue_invoices'](user.id, {})) as Array<{ number: string }>
    const numbers = result.map((r) => r.number)

    expect(numbers).toContain(overdueDoc.number)
    expect(numbers).not.toContain(futureDoc.number)
  })

  it('respects an explicit asOf cutoff', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { number: 'INV-MID', status: 'published', dueDate: '2026-06-10' })

    const beforeCutoff = (await documentHandlers['get_overdue_invoices'](user.id, { asOf: '2026-06-05' })) as Array<{ number: string }>
    expect(beforeCutoff.map((r) => r.number)).not.toContain(doc.number)

    const afterCutoff = (await documentHandlers['get_overdue_invoices'](user.id, { asOf: '2026-06-15' })) as Array<{ number: string }>
    expect(afterCutoff.map((r) => r.number)).toContain(doc.number)
  })
})

describe('get_unlinked_transactions', () => {
  it('returns only revenue transactions with documentId null', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const linkedRevenue = await createTransaction(user.id, { description: 'Linked revenue', documentId: doc.id })
    const unlinkedRevenue = await createTransaction(user.id, { description: 'Unlinked revenue' })
    const unlinkedExpense = await createTransaction(user.id, { description: 'Unlinked expense', type: 'expense' })

    const result = (await documentHandlers['get_unlinked_transactions'](user.id, {})) as Array<{ id: string; description: string }>
    const ids = result.map((r) => r.id)

    expect(ids).toContain(unlinkedRevenue.id)
    expect(ids).not.toContain(linkedRevenue.id)
    expect(ids).not.toContain(unlinkedExpense.id)
  })
})

describe('link_transaction_to_document', () => {
  it('delegates to reconcile and links the transaction', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id)
    const tx = await createTransaction(user.id, { date: '2026-06-05' })

    const result = (await documentHandlers['link_transaction_to_document'](user.id, {
      documentId: doc.id,
      transactionId: tx.id,
    })) as { document: { status: string }; transaction: { documentId: string | null }; warning?: string }

    expect(result.document.status).toBe('published')
    expect(result.transaction.documentId).toBe(doc.id)
    expect(result.warning).toBeUndefined()
  })

  it('surfaces a warning when the transaction amount does not match the document amount due', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    const doc = await createDocument(user.id, { amountDueCents: 100000 })
    const tx = await createTransaction(user.id, { amountCents: 50000 })

    const result = (await documentHandlers['link_transaction_to_document'](user.id, {
      documentId: doc.id,
      transactionId: tx.id,
    })) as { warning?: string }

    expect(result.warning).toBeDefined()
  })

  it('throws when documentId or transactionId is missing', async () => {
    const user = await createUser()
    createdUserIds.push(user.id)

    await expect(documentHandlers['link_transaction_to_document'](user.id, {})).rejects.toThrow()
  })
})
