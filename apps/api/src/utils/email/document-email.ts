import type { documents } from '@mana/db'
import { renderCatalogEmail, type EmailTemplateId } from '@api/utils/email/catalog'
import { formatCalendarDate } from '@api/lib/calendar-date'

const TEMPLATE_IDS: Record<string, EmailTemplateId> = {
  QO: 'quotation-sent',
  INV: 'invoice-sent',
  RC: 'receipt-sent',
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function buildDocumentEmailHtml(document: typeof documents.$inferSelect, viewUrl: string) {
  const id = TEMPLATE_IDS[document.type] ?? 'invoice-sent'
  const date = document.type === 'QO'
    ? document.validUntilDate
    : document.type === 'RC'
      ? document.paidAt
      : document.dueDate

  return renderCatalogEmail(id, {
    recipientName: document.clientName ?? 'there',
    senderName: document.registeredName ?? document.registeredNameEn ?? 'MANA',
    documentNumber: document.number,
    documentType: document.type,
    currency: document.currency,
    amount: formatAmount(document.amountDueCents),
    date: date ? formatCalendarDate(date, 'd MMMM yyyy') : undefined,
    actionUrl: viewUrl,
  })
}
