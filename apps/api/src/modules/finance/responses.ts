import { t } from 'elysia'
import { NullableIsoInstant, NotFoundResponse } from '@api/lib/wire-schema'
import { TransactionTypeSchema, TransactionStatusSchema } from '@api/lib/wire-enums'
import { StorageFileResponse } from '@api/modules/storage/responses'

export const TransactionResponse = t.Object({
  id: t.String(),
  type: TransactionTypeSchema,
  amount: t.Number(),
  description: t.String(),
  category: t.String(),
  date: t.String(),
  status: TransactionStatusSchema,
  walletId: t.Union([t.String(), t.Null()]),
  projectId: t.Optional(t.String()),
  reference: t.Optional(t.String()),
  notes: t.Optional(t.String()),
  currency: t.Optional(t.String()),
  source: t.Union([t.Literal('manual'), t.Literal('ai_receipt')]),
  reviewedAt: NullableIsoInstant,
  aiFlags: t.Optional(t.Array(t.String())),
  isRecurring: t.Optional(t.Boolean()),
  recurringInterval: t.Optional(t.String()),
  documentId: t.Optional(t.String()),
})

export const ImportedReceiptTransactionResponse = t.Object({
  transaction: TransactionResponse,
  file: StorageFileResponse,
})

export const TransactionListResponse = t.Object({
  data: t.Array(TransactionResponse),
  total: t.Number(),
  limit: t.Number(),
  offset: t.Number(),
  hasMore: t.Boolean(),
})

export const RevenueRecordResponse = t.Object({
  amount: t.Number(),
})

export const BulkDeleteTransactionsResponse = t.Object({
  deleted: t.Number(),
})

export const BulkReviewTransactionsResponse = t.Object({
  reviewed: t.Number(),
})

export { NotFoundResponse }
