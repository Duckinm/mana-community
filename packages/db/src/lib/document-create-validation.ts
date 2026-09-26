import { parseCalendarDate } from './calendar-date'

export type DocumentCreateValidationIssue =
  | 'document-type-invalid'
  | 'sender-required'
  | 'client-name-required'
  | 'client-phone-required'
  | 'item-required'
  | 'item-quantity-required'
  | 'item-quantity-fractional'
  | 'item-amount-required'
  | 'item-amount-negative'
  | 'discount-negative'
  | 'rate-out-of-range'
  | 'project-required'
  | 'recurring-interval-required'
  | 'due-before-issue'

export type DocumentAmountsValidationInput = {
  issueDate?: string | null
  dueDate?: string | null
  discountCents?: number | null
  taxRateBps?: number | null
  whtRateBps?: number | null
  items?: readonly {
    quantity?: number | null
    unitPriceCents?: number | null
  }[] | null
}

export type DocumentCreateValidationInput = Omit<DocumentAmountsValidationInput, 'items'> & {
  type: string | null | undefined
  senderProfileId?: string | null
  registeredName?: string | null
  clientName?: string | null
  clientPhone?: string | null
  projectId?: string | null
  isRecurring?: boolean | null
  recurringInterval?: string | null
  items?: readonly {
    description?: string | null
    quantity?: number | null
    unitPriceCents?: number | null
  }[] | null
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function isDocumentType(value: string | null | undefined): value is 'QO' | 'INV' | 'RC' {
  return value === 'QO' || value === 'INV' || value === 'RC'
}

/** Rates are basis points: 0%–100% inclusive. */
function isRateOutOfRange(bps: number | null | undefined): boolean {
  if (bps === null || bps === undefined) return false
  return !Number.isFinite(bps) || bps < 0 || bps > 10_000
}

/**
 * Money and date rules that hold whether the document is being created or
 * edited. Only values that are actually present are checked, so a partial
 * patch stays valid.
 */
export function validateDocumentAmounts(
  input: DocumentAmountsValidationInput,
): DocumentCreateValidationIssue[] {
  const issues: DocumentCreateValidationIssue[] = []
  const items = input.items ?? []

  if (items.some((item) => Number.isFinite(item.quantity) && (item.quantity ?? 0) <= 0)) {
    issues.push('item-quantity-required')
  }
  if (items.some((item) => Number.isFinite(item.quantity) && !Number.isInteger(item.quantity))) {
    issues.push('item-quantity-fractional')
  }
  if (items.some((item) => Number.isFinite(item.unitPriceCents) && (item.unitPriceCents ?? 0) < 0)) {
    issues.push('item-amount-negative')
  }
  if (Number.isFinite(input.discountCents) && (input.discountCents ?? 0) < 0) {
    issues.push('discount-negative')
  }
  if (isRateOutOfRange(input.taxRateBps) || isRateOutOfRange(input.whtRateBps)) {
    issues.push('rate-out-of-range')
  }

  const issueDate = parseCalendarDate(input.issueDate)
  const dueDate = parseCalendarDate(input.dueDate)
  if (issueDate && dueDate && dueDate.getTime() < issueDate.getTime()) {
    issues.push('due-before-issue')
  }

  return issues
}

export function validateDocumentCreate(input: DocumentCreateValidationInput): DocumentCreateValidationIssue[] {
  const issues: DocumentCreateValidationIssue[] = []
  if (!isDocumentType(input.type)) issues.push('document-type-invalid')
  if (!hasText(input.senderProfileId) && !hasText(input.registeredName)) issues.push('sender-required')
  if (!hasText(input.clientName)) issues.push('client-name-required')
  if (!hasText(input.clientPhone)) issues.push('client-phone-required')

  const describedItems = (input.items ?? []).filter((item) => hasText(item.description))
  if (describedItems.length === 0) {
    issues.push('item-required')
  } else {
    if (describedItems.some((item) => !Number.isFinite(item.quantity) || (item.quantity ?? 0) <= 0)) {
      issues.push('item-quantity-required')
    }
    if (!describedItems.some((item) => Number.isFinite(item.unitPriceCents) && (item.unitPriceCents ?? 0) > 0)) {
      issues.push('item-amount-required')
    }
  }

  if ((input.type === 'INV' || input.type === 'RC') && !hasText(input.projectId)) {
    issues.push('project-required')
  }
  if (input.isRecurring && !hasText(input.recurringInterval)) issues.push('recurring-interval-required')

  for (const issue of validateDocumentAmounts(input)) {
    if (!issues.includes(issue)) issues.push(issue)
  }

  return issues
}
