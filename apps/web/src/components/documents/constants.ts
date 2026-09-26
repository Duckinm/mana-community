export const DOCUMENT_TYPE_KEYS: Record<string, string> = {
  QO: 'typeQuotation',
  INV: 'typeInvoice',
  RC: 'typeReceipt',
}

/** Quotation → invoice → receipt — pipeline and list group order */
export const DOCUMENT_TYPE_ORDER = ['QO', 'INV', 'RC'] as const

export const DOCUMENT_TYPE_LOWER_KEYS: Record<string, string> = {
  QO: 'typeQuotationLower',
  INV: 'typeInvoiceLower',
  RC: 'typeReceiptLower',
}

export const DOCUMENT_STATUS_KEYS: Record<string, string> = {
  draft: 'statusDraft',
  published: 'statusPublished',
  archived: 'statusArchived',
  overdue: 'statusOverdue',
}

/**
 * "Published" means different things for each document type — a QO is
 * awaiting client approval, an INV is awaiting payment, an RC confirms
 * payment already happened. Paid/unpaid is tracked via paidAt, not status.
 */
export const DOCUMENT_STATUS_DESCRIPTION_KEYS: Record<string, Record<string, string>> = {
  QO: {
    draft: 'statusDescQoDraft',
    published: 'statusDescQoPublished',
    overdue: 'statusDescQoOverdue',
    archived: 'statusDescQoArchived',
  },
  INV: {
    draft: 'statusDescInvDraft',
    published: 'statusDescInvPublished',
    overdue: 'statusDescInvOverdue',
    archived: 'statusDescInvArchived',
  },
  RC: {
    draft: 'statusDescRcDraft',
    published: 'statusDescRcPublished',
    overdue: 'statusDescRcOverdue',
    archived: 'statusDescRcArchived',
  },
}

export const RECURRING_INTERVAL_KEYS: Record<string, string> = {
  monthly: 'recurringMonthly',
  quarterly: 'recurringQuarterly',
  yearly: 'recurringYearly',
}
