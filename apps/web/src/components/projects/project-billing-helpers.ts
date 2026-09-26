import type { Document, DocumentType } from '@/components/documents/types'
import { isDocumentActive } from '@/lib/document-helpers'
import { formatCalendarDate, parseCalendarDate, todayCalendarDate } from '@/lib/calendar-date'

function daysUntilCalendarDate(dateStr: string): number | null {
  const target = parseCalendarDate(dateStr)
  const today = parseCalendarDate(todayCalendarDate())
  if (!target || !today) return null
  const msPerDay = 86_400_000
  return Math.round((target.getTime() - today.getTime()) / msPerDay)
}

export function formatProjectMoney(cents: number, currency = 'USD'): string {
  const amount = cents / 100
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
}

export interface ProjectBillingSummary {
  currency: string
  quotedCents: number
  invoicedCents: number
  collectedCents: number
  outstandingCents: number
}

export function summarizeProjectBilling(docs: Document[]): ProjectBillingSummary {
  const currency = docs.find((d) => d.currency)?.currency ?? 'USD'
  const active = docs.filter(isDocumentActive)

  const quotedCents = active
    .filter((d) => d.type === 'QO' && d.status !== 'draft')
    .reduce((sum, d) => sum + d.amountDueCents, 0)

  const invoicedCents = active
    .filter((d) => d.type === 'INV' && d.status !== 'draft')
    .reduce((sum, d) => sum + d.amountDueCents, 0)

  const collectedFromInvoices = active
    .filter((d) => d.type === 'INV' && d.paidAt)
    .reduce((sum, d) => sum + d.amountDueCents, 0)

  const collectedFromReceipts = active
    .filter((d) => d.type === 'RC' && d.status !== 'draft')
    .reduce((sum, d) => sum + d.amountDueCents, 0)

  const collectedCents = collectedFromInvoices + collectedFromReceipts

  const outstandingCents = active
    .filter((d) => d.type === 'INV' && !d.paidAt && d.status !== 'draft')
    .reduce((sum, d) => sum + d.amountDueCents, 0)

  return {
    currency,
    quotedCents,
    invoicedCents,
    collectedCents,
    outstandingCents,
  }
}

export interface CashflowChartPoint {
  month: string
  idealSell: number
  idealPurchase: number
  current: number
}

export function dueDateMeta(
  doc: Document,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { label: string; tone: 'default' | 'warning' | 'danger' } {
  if (!doc.dueDate) {
    return { label: t('dueMeta.noDueDate'), tone: 'default' }
  }
  const days = daysUntilCalendarDate(doc.dueDate)
  const formatted = formatCalendarDate(doc.dueDate)
  if (doc.paidAt || doc.type === 'RC') {
    return { label: t('dueMeta.due', { date: formatted }), tone: 'default' }
  }
  if (days === null) return { label: t('dueMeta.due', { date: formatted }), tone: 'default' }
  if (days < 0) return { label: t('dueMeta.overdue', { date: formatted }), tone: 'danger' }
  if (days === 0) return { label: t('dueMeta.dueToday'), tone: 'warning' }
  if (days <= 7) return { label: t('dueMeta.dueInDays', { count: days, date: formatted }), tone: 'warning' }
  return { label: t('dueMeta.due', { date: formatted }), tone: 'default' }
}

export const STAGE_ORDER: DocumentType[] = ['QO', 'INV', 'RC']
