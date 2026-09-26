import { todayCalendarDate } from '@/lib/calendar-date'
import type { DocumentStatus } from '@/components/documents/types'

export function isDocumentActive(doc: { deletedAt?: string | null }): boolean {
  return doc.deletedAt == null
}

export function isDocumentOverdue(
  doc: { status: string; dueDate?: string | null },
  asOf: string = todayCalendarDate(),
): boolean {
  if (doc.status === 'overdue') return true
  return doc.status === 'published' && doc.dueDate != null && doc.dueDate < asOf
}

export function documentDisplayStatus(
  doc: { status: string; dueDate?: string | null },
  asOf: string = todayCalendarDate(),
): DocumentStatus {
  if (doc.status === 'draft') return 'draft'
  if (doc.status === 'archived') return 'archived'
  if (isDocumentOverdue(doc, asOf)) return 'overdue'
  if (doc.status === 'published') return 'published'
  return doc.status as DocumentStatus
}

/** QO→INV needs a published quotation; INV→RC needs a published AND paid invoice. */
export function canPromoteDocument(doc: {
  type: string
  status: string
  paidAt?: string | null
  deletedAt?: string | null
}): boolean {
  // 'overdue' is display-only sugar over 'published', so exclude the rest instead.
  const published =
    isDocumentActive(doc) && doc.status !== 'draft' && doc.status !== 'archived'
  if (!published) return false
  if (doc.type === 'QO') return true
  return doc.type === 'INV' && doc.paidAt != null
}

export function isDocumentOpenForPayment(doc: {
  status: string
  paidAt?: string | null
  deletedAt?: string | null
}): boolean {
  return isDocumentActive(doc) && doc.status !== 'draft' && !doc.paidAt
}
