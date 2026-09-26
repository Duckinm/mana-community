import { eq, and, desc, isNull } from 'drizzle-orm'
import { documents, transactions } from '@mana/db'
import { db } from '@api/db'
import { todayCalendarDate } from '@api/lib/calendar-date'
import { documentDisplayStatus, isOverdue, unpaidInvoiceConditions, overdueInvoiceConditions } from '@api/lib/document-status'
import { toTx } from '@api/modules/finance/service'
import { reconcile } from '@api/modules/reconciliation/service'
import { sendDocumentEmail } from '@api/modules/documents/send-email'
import { createDocument, getDocument, listDocuments } from '@api/modules/documents/service'
import { publishDocument } from '@api/modules/documents/publication'
import { fromQuantity, toQuantity } from '@api/lib/quantity'
import { ValidationError } from '@api/lib/errors'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

const DOCUMENT_LIST_DEFAULT_LIMIT = 20
const DOCUMENT_LIST_MAX_LIMIT = 50
const DOCUMENT_LIST_MAX_PAGE = 1_000
const DOCUMENT_DETAIL_ITEM_LIMIT = 50
const DOCUMENT_DETAIL_REMARK_LIMIT = 1_000

type McpDocument = Awaited<ReturnType<typeof getDocument>>

function toMcpDocumentSummary(document: McpDocument) {
  return {
    id: document.id,
    type: document.type,
    status: documentDisplayStatus(document),
    number: document.number,
    projectId: document.projectId,
    contactId: document.contactId,
    clientName: document.clientName ?? document.clientNameTh,
    currency: document.currency,
    total: document.totalCents / 100,
    amountDue: document.amountDueCents / 100,
    issueDate: document.issueDate,
    dueDate: document.dueDate,
    paidAt: document.paidAt,
    isRecurring: document.isRecurring,
    updatedAt: document.updatedAt,
  }
}

function toMcpDocumentDetail(document: McpDocument) {
  const remark = document.remark ?? ''
  return {
    ...toMcpDocumentSummary(document),
    documentLanguage: document.documentLanguage,
    sender: {
      profileId: document.senderProfileId,
      name: document.registeredName ?? document.registeredNameEn,
    },
    totals: {
      subtotal: document.subtotalCents / 100,
      discount: document.discountCents / 100,
      tax: document.taxCents / 100,
      withholdingTax: document.whtCents / 100,
      total: document.totalCents / 100,
      amountDue: document.amountDueCents / 100,
    },
    validUntilDate: document.validUntilDate,
    paymentSlipStatus: document.latestPaymentSlipStatus,
    recurringInterval: document.recurringInterval,
    nextGenerationDate: document.nextGenerationDate,
    remark: remark.slice(0, DOCUMENT_DETAIL_REMARK_LIMIT) || null,
    remarkTruncated: remark.length > DOCUMENT_DETAIL_REMARK_LIMIT,
    items: document.items.slice(0, DOCUMENT_DETAIL_ITEM_LIMIT).map((item) => ({
      description: item.description,
      quantity: fromQuantity(item.quantity),
      unitPrice: item.unitPriceCents / 100,
      total: item.subtotalCents / 100,
    })),
    itemCount: document.items.length,
    hasMoreItems: document.items.length > DOCUMENT_DETAIL_ITEM_LIMIT,
  }
}

function documentListFilters(args: Record<string, unknown>) {
  const type = optionalString(args, 'type')
  if (type !== undefined && !['QO', 'INV', 'RC'].includes(type)) {
    throw new Error('type must be QO, INV, or RC')
  }

  const status = optionalString(args, 'status')
  if (status !== undefined && !['draft', 'published', 'overdue', 'archived'].includes(status)) {
    throw new Error('status must be draft, published, overdue, or archived')
  }

  let paid: 'paid' | 'unpaid' | undefined
  if (args.paid === 'paid' || args.paid === 'unpaid') {
    paid = args.paid
  } else if (args.paid !== undefined) {
    throw new Error('paid must be paid or unpaid')
  }

  const page = args.page === undefined ? 1 : args.page
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > DOCUMENT_LIST_MAX_PAGE) {
    throw new Error(`page must be an integer from 1 to ${DOCUMENT_LIST_MAX_PAGE}`)
  }

  const limit = args.limit === undefined ? DOCUMENT_LIST_DEFAULT_LIMIT : args.limit
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > DOCUMENT_LIST_MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${DOCUMENT_LIST_MAX_LIMIT}`)
  }

  return {
    type,
    status,
    paid,
    page,
    limit,
    projectId: optionalString(args, 'projectId'),
    recurring: optionalBoolean(args, 'recurring'),
    search: optionalString(args, 'search'),
    from: optionalString(args, 'from'),
    to: optionalString(args, 'to'),
    sort: 'issueDateDesc' as const,
  }
}

async function mcpListDocuments(userId: string, args: Record<string, unknown>) {
  const result = await listDocuments(userId, documentListFilters(args))
  return {
    items: result.data.map(toMcpDocumentSummary),
    page: result.page,
    limit: result.limit,
    hasMore: result.page < result.totalPages,
  }
}

function toInvoiceSummary(row: typeof documents.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    number: row.number,
    status: row.status,
    contactId: row.contactId ?? undefined,
    projectId: row.projectId ?? undefined,
    currency: row.currency,
    amountDue: row.amountDueCents / 100,
    issueDate: row.issueDate ?? undefined,
    dueDate: row.dueDate ?? undefined,
    paidAt: row.paidAt ?? undefined,
  }
}

/**
 * Unpaid invoices. Overdue is derived from dueDate via isOverdue — not stored on status.
 */
async function getUnpaidInvoices(userId: string) {
  const rows = await db
    .select()
    .from(documents)
    .where(unpaidInvoiceConditions(userId))
    .orderBy(desc(documents.dueDate))

  return rows.map((row) => ({ ...toInvoiceSummary(row), isOverdue: isOverdue(row) }))
}

/**
 * Unpaid invoices whose dueDate is on or before the cutoff (defaults to today).
 */
export async function getOverdueInvoices(userId: string, asOf?: string) {
  const cutoff = asOf ?? todayCalendarDate()
  const rows = await db
    .select()
    .from(documents)
    .where(overdueInvoiceConditions(userId, cutoff))
    .orderBy(desc(documents.dueDate))

  return rows.map((row) => ({ ...toInvoiceSummary(row), isOverdue: true }))
}

/** Revenue transactions not yet linked to any document — reconciliation gaps. */
async function getUnlinkedTransactions(userId: string) {
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.type, 'revenue'), isNull(transactions.documentId)))
    .orderBy(desc(transactions.date))
  return rows.map(toTx)
}

async function linkTransactionToDocument(userId: string, documentId: string, transactionId: string) {
  return reconcile(userId, documentId, transactionId)
}

async function sendDocumentEmailTool(userId: string, documentId: string) {
  const result = await sendDocumentEmail(userId, documentId)
  if (result.status === 'no_client_email') {
    return { message: 'This document has no client email on file' }
  }
  if (result.status === 'plan_limit') {
    return {
      error: 'PLAN_LIMIT_DOCS_SENT',
      message: `Monthly document-send limit reached (${result.used}/${result.cap} on Free). Upgrade to Mana or Aether for unlimited sends — the cap resets at the start of next month.`,
      used: result.used,
      cap: result.cap,
    }
  }
  return { status: result.status, sentAt: result.sentAt }
}

type CreateDocumentArgs = {
  type: 'QO' | 'INV' | 'RC'
  projectId?: string
  contactId?: string
  senderProfileId?: string
  currency?: string
  documentLanguage?: string
  issueDate?: string
  dueDate?: string
  discountCents?: number
  taxRateBps?: number
  whtRateBps?: number
  vatRegistered?: boolean
  remark?: string
  registeredName?: string
  registeredNameEn?: string
  yourEmail?: string
  yourPhone?: string
  registeredAddress?: string
  registeredAddressEn?: string
  yourCountry?: string
  yourZip?: string
  yourTaxId?: string
  yourBranchNumber?: string
  clientName?: string
  clientNameTh?: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  clientAddressTh?: string
  clientCountry?: string
  clientZip?: string
  clientTaxId?: string
  clientBranchNumber?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  swiftCode?: string
  promptPayId?: string
  cardNumber?: string
  cardExpiry?: string
  cardholderName?: string
  isRecurring?: boolean
  recurringInterval?: string
  items: { description: string; quantity: number; unitPriceCents: number }[]
}

async function mcpCreateDocument(userId: string, args: CreateDocumentArgs) {
  const doc = await createDocument(userId, {
    type: args.type,
    projectId: args.projectId,
    contactId: args.contactId,
    senderProfileId: args.senderProfileId,
    currency: args.currency,
    documentLanguage: args.documentLanguage,
    issueDate: args.issueDate,
    dueDate: args.dueDate,
    discountCents: args.discountCents,
    taxRateBps: args.taxRateBps,
    whtRateBps: args.whtRateBps,
    vatRegistered: args.vatRegistered,
    remark: args.remark,
    registeredName: args.registeredName,
    registeredNameEn: args.registeredNameEn,
    yourEmail: args.yourEmail,
    yourPhone: args.yourPhone,
    registeredAddress: args.registeredAddress,
    registeredAddressEn: args.registeredAddressEn,
    yourCountry: args.yourCountry,
    yourZip: args.yourZip,
    yourTaxId: args.yourTaxId,
    yourBranchNumber: args.yourBranchNumber,
    clientName: args.clientName,
    clientNameTh: args.clientNameTh,
    clientEmail: args.clientEmail,
    clientPhone: args.clientPhone,
    clientAddress: args.clientAddress,
    clientAddressTh: args.clientAddressTh,
    clientCountry: args.clientCountry,
    clientZip: args.clientZip,
    clientTaxId: args.clientTaxId,
    clientBranchNumber: args.clientBranchNumber,
    bankName: args.bankName,
    accountNumber: args.accountNumber,
    accountName: args.accountName,
    swiftCode: args.swiftCode,
    promptPayId: args.promptPayId,
    cardNumber: args.cardNumber,
    cardExpiry: args.cardExpiry,
    cardholderName: args.cardholderName,
    isRecurring: args.isRecurring,
    recurringInterval: args.recurringInterval as 'monthly' | 'quarterly' | 'yearly' | undefined,
    items: args.items.map((item, position) => ({ ...item, quantity: toQuantity(item.quantity), position })),
  })
  return {
    id: doc.id,
    type: doc.type,
    number: doc.number,
    status: doc.status,
    contactId: doc.contactId ?? undefined,
    projectId: doc.projectId ?? undefined,
    currency: doc.currency,
    amountDue: doc.amountDueCents / 100,
    issueDate: doc.issueDate ?? undefined,
    dueDate: doc.dueDate ?? undefined,
  }
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  return typeof args[key] === 'string' ? args[key] : undefined
}

function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key]
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${key} is required`)
  return value
}

function optionalNumber(args: Record<string, unknown>, key: string): number | undefined {
  return typeof args[key] === 'number' ? args[key] : undefined
}

function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  return typeof args[key] === 'boolean' ? args[key] : undefined
}

function createDocumentArgs(args: Record<string, unknown>): CreateDocumentArgs {
  if (args.type !== 'QO' && args.type !== 'INV' && args.type !== 'RC') {
    throw new Error('create_document requires type (QO/INV/RC)')
  }
  if (!Array.isArray(args.items)) throw new Error('create_document requires an items array')

  const items = args.items.map((item) => {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.description !== 'string' ||
      typeof item.quantity !== 'number' ||
      typeof item.unitPriceCents !== 'number'
    ) {
      throw new Error('Each document item requires description, quantity, and unitPriceCents')
    }
    return {
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    }
  })

  return {
    type: args.type,
    projectId: optionalString(args, 'projectId'),
    contactId: optionalString(args, 'contactId'),
    senderProfileId: optionalString(args, 'senderProfileId'),
    currency: optionalString(args, 'currency'),
    documentLanguage: optionalString(args, 'documentLanguage'),
    issueDate: optionalString(args, 'issueDate'),
    dueDate: optionalString(args, 'dueDate'),
    discountCents: optionalNumber(args, 'discountCents'),
    taxRateBps: optionalNumber(args, 'taxRateBps'),
    whtRateBps: optionalNumber(args, 'whtRateBps'),
    vatRegistered: optionalBoolean(args, 'vatRegistered'),
    remark: optionalString(args, 'remark'),
    registeredName: optionalString(args, 'registeredName'),
    registeredNameEn: optionalString(args, 'registeredNameEn'),
    yourEmail: optionalString(args, 'yourEmail'),
    yourPhone: optionalString(args, 'yourPhone'),
    registeredAddress: optionalString(args, 'registeredAddress'),
    registeredAddressEn: optionalString(args, 'registeredAddressEn'),
    yourCountry: optionalString(args, 'yourCountry'),
    yourZip: optionalString(args, 'yourZip'),
    yourTaxId: optionalString(args, 'yourTaxId'),
    yourBranchNumber: optionalString(args, 'yourBranchNumber'),
    clientName: optionalString(args, 'clientName'),
    clientNameTh: optionalString(args, 'clientNameTh'),
    clientEmail: optionalString(args, 'clientEmail'),
    clientPhone: optionalString(args, 'clientPhone'),
    clientAddress: optionalString(args, 'clientAddress'),
    clientAddressTh: optionalString(args, 'clientAddressTh'),
    clientCountry: optionalString(args, 'clientCountry'),
    clientZip: optionalString(args, 'clientZip'),
    clientTaxId: optionalString(args, 'clientTaxId'),
    clientBranchNumber: optionalString(args, 'clientBranchNumber'),
    bankName: optionalString(args, 'bankName'),
    accountNumber: optionalString(args, 'accountNumber'),
    accountName: optionalString(args, 'accountName'),
    swiftCode: optionalString(args, 'swiftCode'),
    promptPayId: optionalString(args, 'promptPayId'),
    cardNumber: optionalString(args, 'cardNumber'),
    cardExpiry: optionalString(args, 'cardExpiry'),
    cardholderName: optionalString(args, 'cardholderName'),
    isRecurring: optionalBoolean(args, 'isRecurring'),
    recurringInterval: optionalString(args, 'recurringInterval'),
    items,
  }
}

export const documentTools = [
  {
    name: 'list_documents',
    description: 'List your documents in pages of up to 50. Returns document IDs and current status so you can choose one to inspect with get_document.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['QO', 'INV', 'RC'] },
        status: { type: 'string', enum: ['draft', 'published', 'overdue', 'archived'] },
        paid: { type: 'string', enum: ['paid', 'unpaid'] },
        projectId: { type: 'string' },
        recurring: { type: 'boolean' },
        search: { type: 'string', maxLength: 160, description: 'Match document number or client name.' },
        from: { type: 'string', description: 'Issue date on or after YYYY-MM-DD.' },
        to: { type: 'string', description: 'Issue date on or before YYYY-MM-DD.' },
        page: { type: 'integer', minimum: 1, maximum: DOCUMENT_LIST_MAX_PAGE, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: DOCUMENT_LIST_MAX_LIMIT, default: DOCUMENT_LIST_DEFAULT_LIMIT },
      },
      required: [],
    },
  },
  {
    name: 'get_document',
    description: 'Read one of your documents by ID. Returns a bounded business summary and up to 50 line items; it never returns public links, PDFs, payment account details, or client contact details.',
    input_schema: {
      type: 'object' as const,
      properties: { documentId: { type: 'string' } },
      required: ['documentId'],
    },
  },
  {
    name: 'publish_document',
    description: 'Publish one of your draft documents using MANA’s normal publishing checks. It never emails the client or returns a PDF or public link. External MCP requires confirmPublish true after the user confirms.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documentId: { type: 'string' },
        confirmPublish: { type: 'boolean', description: 'Required as true by external MCP after the user confirms publishing this document.' },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'get_unpaid_invoices',
    description: 'Return outstanding unpaid invoices (published, including those past due date)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_overdue_invoices',
    description: 'Return unpaid invoices whose due date is on or before today (or an optional asOf date)',
    input_schema: {
      type: 'object' as const,
      properties: { asOf: { type: 'string', description: 'YYYY-MM-DD, defaults to today' } },
      required: [],
    },
  },
  {
    name: 'get_unlinked_transactions',
    description: 'Return revenue transactions that are not yet linked to any invoice/document — useful for finding reconciliation gaps',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'link_transaction_to_document',
    description: 'Link a transaction to an invoice/document, marking the document as paid (reconciliation). Returns the updated document and transaction, plus a warning if the transaction amount does not match the document\'s amount due.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documentId: { type: 'string' },
        transactionId: { type: 'string' },
      },
      required: ['documentId', 'transactionId'],
    },
  },
  {
    name: 'send_document_email',
    description: 'Email a document (quotation/invoice/receipt) to its client, with a link to view it. Works for both the initial send and resends. Returns { status, sentAt } on success (status is "sent", "blocked", or "failed"), or a message if the document has no client email on file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        documentId: { type: 'string' },
      },
      required: ['documentId'],
    },
  },
  {
    name: 'create_document',
    description: 'Create a new quotation, invoice, or receipt draft using the same checks as the document workflow. Supply a senderProfileId or registeredName, then either contactId or both clientName and clientPhone. A contact fills its saved details. INV and RC also need projectId. Each item needs a description, quantity, and unitPriceCents (price per unit in cents).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: { type: 'string', enum: ['QO', 'INV', 'RC'], description: 'QO = quotation, INV = invoice, RC = receipt' },
        projectId: { type: 'string' },
        contactId: { type: 'string' },
        senderProfileId: { type: 'string', description: 'Saved sender profile ID. Provide this or registeredName.' },
        currency: { type: 'string', description: 'e.g. THB, USD — defaults to the user\'s default currency' },
        documentLanguage: { type: 'string', enum: ['th', 'en'] },
        issueDate: { type: 'string', description: 'YYYY-MM-DD' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD' },
        discountCents: { type: 'number' },
        taxRateBps: { type: 'number' },
        whtRateBps: { type: 'number' },
        vatRegistered: { type: 'boolean' },
        remark: { type: 'string' },
        registeredName: { type: 'string', description: 'Sender name when not using senderProfileId.' },
        registeredNameEn: { type: 'string' },
        yourEmail: { type: 'string' },
        yourPhone: { type: 'string' },
        registeredAddress: { type: 'string' },
        registeredAddressEn: { type: 'string' },
        yourCountry: { type: 'string' },
        yourZip: { type: 'string' },
        yourTaxId: { type: 'string' },
        yourBranchNumber: { type: 'string' },
        clientName: { type: 'string', description: 'Required with clientPhone when contactId is not supplied.' },
        clientNameTh: { type: 'string' },
        clientEmail: { type: 'string' },
        clientPhone: { type: 'string', description: 'Required with clientName when contactId is not supplied.' },
        clientAddress: { type: 'string' },
        clientAddressTh: { type: 'string' },
        clientCountry: { type: 'string' },
        clientZip: { type: 'string' },
        clientTaxId: { type: 'string' },
        clientBranchNumber: { type: 'string' },
        bankName: { type: 'string' },
        accountNumber: { type: 'string' },
        accountName: { type: 'string' },
        swiftCode: { type: 'string' },
        promptPayId: { type: 'string' },
        cardNumber: { type: 'string' },
        cardExpiry: { type: 'string' },
        cardholderName: { type: 'string' },
        isRecurring: { type: 'boolean' },
        recurringInterval: { type: 'string', enum: ['monthly', 'quarterly', 'yearly'] },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              description: { type: 'string', minLength: 1 },
              quantity: { type: 'integer', minimum: 1, description: 'Whole unit count, e.g. 1 or 3' },
              unitPriceCents: { type: 'number' },
            },
            required: ['description', 'quantity', 'unitPriceCents'],
          },
        },
      },
      required: ['type', 'items'],
      allOf: [
        { anyOf: [{ required: ['senderProfileId'] }, { required: ['registeredName'] }] },
        { anyOf: [{ required: ['contactId'] }, { required: ['clientName', 'clientPhone'] }] },
      ],
    },
  },
] as const

export const documentHandlers: Record<string, McpToolHandler> = {
  'list_documents': (userId, args) => mcpListDocuments(userId, args),
  'get_document': async (userId, args) => {
    return toMcpDocumentDetail(await getDocument(userId, requiredString(args, 'documentId')))
  },
  'publish_document': async (userId, args, context) => {
    if (context?.source === 'external-mcp' && args.confirmPublish !== true) {
      throw new ValidationError('confirmPublish must be true after the user confirms publishing this document')
    }
    const documentId = requiredString(args, 'documentId')
    await publishDocument(userId, documentId, { sendEmail: false })
    return toMcpDocumentSummary(await getDocument(userId, documentId))
  },
  'get_unpaid_invoices': (userId) => getUnpaidInvoices(userId),
  'get_overdue_invoices': async (userId, args) => {
    return getOverdueInvoices(userId, typeof args.asOf === 'string' ? args.asOf : undefined)
  },
  'get_unlinked_transactions': (userId) => getUnlinkedTransactions(userId),
  'link_transaction_to_document': async (userId, args) => {
    if (typeof args.documentId !== 'string' || typeof args.transactionId !== 'string') {
      throw new Error('link_transaction_to_document requires documentId and transactionId')
    }
    return linkTransactionToDocument(userId, args.documentId, args.transactionId)
  },
  'send_document_email': async (userId, args) => {
    if (typeof args.documentId !== 'string') {
      throw new Error('send_document_email requires documentId')
    }
    return sendDocumentEmailTool(userId, args.documentId)
  },
  'create_document': async (userId, args) => {
    return mcpCreateDocument(userId, createDocumentArgs(args))
  },
}
