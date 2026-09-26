import { t } from 'elysia'

export { CreateTransactionBody, UpdateTransactionBody } from '@api/lib/db-schema'

export const ImportReceiptBody = t.Object({
  file: t.File(),
})

export const TransactionQueryParams = t.Object({
  type: t.Optional(t.String()),
  status: t.Optional(t.String()),
  walletId: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
  q: t.Optional(t.String()),
  unlinked: t.Optional(t.String()),
  needsReview: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String()),
})
