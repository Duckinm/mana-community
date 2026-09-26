import { and, eq, isNull, isNotNull, or, lt, lte } from 'drizzle-orm'
import { documents } from '@mana/db'
import { todayCalendarDate } from '@api/lib/calendar-date'

type DocumentRow = Pick<typeof documents.$inferSelect, 'status' | 'dueDate'>

export type DocumentStatus = 'draft' | 'published' | 'overdue'
export type DocumentEvent = 'publish' | 'reconcile' | 'unreconcile'

const VALID_TRANSITIONS: Record<DocumentEvent, { from: DocumentStatus[]; to: DocumentStatus }> = {
  publish:     { from: ['draft'],                to: 'published' },
  reconcile:   { from: ['published', 'overdue'], to: 'published' },
  unreconcile: { from: ['published'],             to: 'published' },
}

export function transitionDocument(currentStatus: DocumentStatus, event: DocumentEvent): DocumentStatus {
  const rule = VALID_TRANSITIONS[event]
  if (!rule.from.includes(currentStatus)) {
    throw new Error(`Invalid Document transition: ${currentStatus} → ${event}`)
  }
  return rule.to
}

/** Overdue is computed from dueDate; stored status='overdue' is legacy-only. */
export function isOverdue(doc: DocumentRow, asOf: string = todayCalendarDate()): boolean {
  if (doc.status === 'overdue') return true
  return doc.status === 'published' && doc.dueDate !== null && doc.dueDate < asOf
}

export function documentDisplayStatus(doc: DocumentRow, asOf: string = todayCalendarDate()): DocumentStatus {
  if (doc.status === 'draft') return 'draft'
  if (isOverdue(doc, asOf)) return 'overdue'
  return 'published'
}

export function isOpenInvoice(
  doc: { type: string; status: string; paidAt?: string | null },
): boolean {
  if (doc.type !== 'INV') return false
  if (doc.paidAt) return false
  return doc.status === 'published' || doc.status === 'overdue'
}

/** Unpaid invoices: published (including computed-overdue) or legacy stored overdue. */
export function unpaidInvoiceConditions(userId: string) {
  return and(
    eq(documents.userId, userId),
    eq(documents.type, 'INV'),
    isNull(documents.deletedAt),
    isNull(documents.paidAt),
    or(eq(documents.status, 'published'), eq(documents.status, 'overdue')),
  )
}

/** SQL filter matching invoices overdue as of a calendar date (computed + legacy stored). */
export function overdueInvoiceConditions(userId: string, asOf: string = todayCalendarDate()) {
  return and(
    unpaidInvoiceConditions(userId),
    isNotNull(documents.dueDate),
    lte(documents.dueDate, asOf),
  )
}

/** SQL filter for listDocuments status=overdue (computed + legacy stored). */
export function overdueDocumentListConditions(asOf: string = todayCalendarDate()) {
  return or(
    eq(documents.status, 'overdue'),
    and(eq(documents.status, 'published'), isNotNull(documents.dueDate), lt(documents.dueDate, asOf)),
  )!
}
