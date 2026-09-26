import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import {
  listTransactions,
  getRevenueRecord,
  getTransaction,
  createTransaction,
  patchTransaction,
  deleteTransaction,
  bulkDeleteTransactions,
  bulkReviewTransactions,
  importReceiptTransaction,
} from '@api/modules/finance/service'
import { CreateTransactionBody, ImportReceiptBody, UpdateTransactionBody, TransactionQueryParams } from '@api/modules/finance/model'
import {
  ImportedReceiptTransactionResponse,
  TransactionResponse,
  TransactionListResponse,
  RevenueRecordResponse,
  BulkDeleteTransactionsResponse,
  BulkReviewTransactionsResponse,
  NotFoundResponse,
} from '@api/modules/finance/responses'
import { ErrorResponse, NoContentResponse } from '@api/lib/wire-schema'

export const financeModule = new Elysia({ name: 'finance', prefix: '/api/finance' })
  .use(betterAuthPlugin)

  .get('/transactions', async ({ user, query }) => {
    return listTransactions(user.id, {
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
      type: query.type,
      status: query.status,
      walletId: query.walletId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      q: query.q,
      unlinked: query.unlinked === 'true',
      needsReview: query.needsReview === 'true',
    })
  }, {
    auth: true,
    query: TransactionQueryParams,
    response: { 200: TransactionListResponse },
    detail: { tags: ['Finance'], summary: 'List transactions' },
  })

  .get('/transactions/revenue-record', async ({ user }) => {
    return getRevenueRecord(user.id)
  }, {
    auth: true,
    response: { 200: RevenueRecordResponse },
    detail: { tags: ['Finance'], summary: 'Get highest revenue transaction amount' },
  })

  .get('/transactions/:id', async ({ user, status, params }) => {
    const tx = await getTransaction(user.id, params.id)
    if (!tx) return status(404, { message: 'Not found' })
    return tx
  }, {
    auth: true,
    response: { 200: TransactionResponse, 404: NotFoundResponse },
    detail: { tags: ['Finance'], summary: 'Get transaction' },
  })

  .post('/transactions', async ({ user, status, body }) => {
    const tx = await createTransaction(user.id, body)
    return status(201, tx)
  }, {
    auth: true,
    body: CreateTransactionBody,
    response: { 201: TransactionResponse },
    detail: { tags: ['Finance'], summary: 'Create transaction' },
  })

  .post('/transactions/import-receipt', async ({ user, status, body }) => {
    try {
      const imported = await importReceiptTransaction(user.id, body.file)
      return status(201, imported)
    } catch (err) {
      return status(400, { error: err instanceof Error ? err.message : 'Could not import receipt' })
    }
  }, {
    auth: true,
    body: ImportReceiptBody,
    response: { 201: ImportedReceiptTransactionResponse, 400: ErrorResponse },
    detail: { tags: ['Finance'], summary: 'Import receipt as transaction' },
  })

  .patch('/transactions/:id', async ({ user, status, params, body }) => {
    const updated = await patchTransaction(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateTransactionBody,
    response: { 200: TransactionResponse, 404: NotFoundResponse },
    detail: { tags: ['Finance'], summary: 'Update transaction' },
  })

  .delete('/transactions/:id', async ({ user, status, params }) => {
    const deleted = await deleteTransaction(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { auth: true, response: { 204: NoContentResponse, 404: NotFoundResponse }, detail: { tags: ['Finance'], summary: 'Delete transaction' } })

  .delete('/transactions', async ({ user, body }) => {
    return bulkDeleteTransactions(user.id, body.ids)
  }, {
    auth: true,
    body: t.Object({ ids: t.Array(t.String()) }),
    response: { 200: BulkDeleteTransactionsResponse },
    detail: { tags: ['Finance'], summary: 'Bulk delete transactions by ID list' },
  })

  .post('/transactions/bulk-review', async ({ user, body }) => {
    return bulkReviewTransactions(user.id, body.ids)
  }, {
    auth: true,
    body: t.Object({ ids: t.Optional(t.Array(t.String())) }),
    response: { 200: BulkReviewTransactionsResponse },
    detail: { tags: ['Finance'], summary: 'Accept AI-imported transactions (all pending when ids omitted)' },
  })
