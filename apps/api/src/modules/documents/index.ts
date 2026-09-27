import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import { setDocumentImage, clearDocumentImage } from '@api/modules/documents/service'
import {
  listDocuments,
  createDocument,
  getDocument,
  patchDocument,
  softDeleteDocument,
  listVersions,
  listDocumentsByProject,
  generateRecurringDocuments,
  revokeDocumentPublicLink,
  rotateDocumentPublicLink,
} from '@api/modules/documents/service'
import {
  approveDocumentByToken,
  getDocumentByPublicToken,
  markDocumentViewed,
  rejectDocumentByToken,
} from '@api/modules/documents/public-access'
import { publishDocument, getDocumentPdfUrl, getDocumentPdfUrlByToken } from '@api/modules/documents/publication'
import {
  CreateDocumentBody,
  UpdateDocumentBody,
  PromoteDocumentBody,
  PublishDocumentBody,
  DocumentListQuery,
  LinkTransactionBody,
} from '@api/modules/documents/model'
import {
  DocumentWire,
  GuestDocumentWire,
  DocumentListResponse,
  DocumentVersionsListResponse,
  DocumentsByProjectResponse,
} from '@api/modules/documents/responses'
import { NotFoundResponse, MessageResponse, NoContentResponse, ErrorResponse } from '@api/lib/wire-schema'
import { reconcile, unlinkDocumentTransaction } from '@api/modules/reconciliation/service'
import { promote } from '@api/modules/promotion/service'
import { getTransaction, toTx } from '@api/modules/finance/service'
import { sendDocumentEmail } from '@api/modules/documents/send-email'
import { sendDocumentEtax } from '@api/modules/documents/send-etax'
import { ConflictError, mapRouteError } from '@api/lib/errors'
import { clientIp, hitRateLimit } from '@api/lib/rate-limiter'
import { requireCronSecret } from '@api/lib/cron-secret'

function setPublicDocumentHeaders(headers: { [key: string]: string | number | undefined }) {
  headers['cache-control'] = 'private, no-store'
  headers['referrer-policy'] = 'no-referrer'
  headers['x-robots-tag'] = 'noindex, nofollow, noarchive'
}

export const documentsModule = new Elysia({ name: 'documents', prefix: '/api/documents' })
  .use(betterAuthPlugin)

  .get('/', async ({ user, query }) => {
    return listDocuments(user.id, {
      type: query.type,
      projectId: query.projectId,
      status: query.status,
      recurring: query.recurring,
      paid: query.paid,
      search: query.search,
      from: query.from,
      to: query.to,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    })
  }, {
    auth: true,
    query: DocumentListQuery,
    response: { 200: DocumentListResponse },
    detail: { tags: ['Documents'], summary: 'List documents' },
  })

  .post('/', async ({ user, status, body }) => {
    try {
      const doc = await createDocument(user.id, body)
      return status(201, doc)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    body: CreateDocumentBody,
    response: { 201: DocumentWire, 400: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Create document' },
  })

  .get('/:id', async ({ user, status, params }) => {
    try {
      return await getDocument(user.id, params.id)
    } catch {
      return status(404, { message: 'Not found' })
    }
  }, {
    auth: true,
    response: { 200: DocumentWire, 404: NotFoundResponse },
    detail: { tags: ['Documents'], summary: 'Get document' },
  })

  .patch('/:id', async ({ user, status, params, body }) => {
    try {
      return await patchDocument(user.id, params.id, body)
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    body: UpdateDocumentBody,
    response: { 200: DocumentWire, 404: NotFoundResponse, 400: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Patch document' },
  })

  .delete('/:id', async ({ user, status, params }) => {
    try {
      await softDeleteDocument(user.id, params.id)
      return status(204, undefined)
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(500, { message: msg })
    }
  }, {
    auth: true,
    response: {
      204: NoContentResponse,
      404: NotFoundResponse,
      500: MessageResponse,
    },
    detail: { tags: ['Documents'], summary: 'Archive (soft-delete) document' },
  })

  .post('/:id/publish', async ({ user, status, params, body }) => {
    try {
      const { document, emailStatus } = await publishDocument(user.id, params.id, { sendEmail: body?.sendEmail })
      return { ...document, emailStatus }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    body: PublishDocumentBody,
    detail: { tags: ['Documents'], summary: 'Publish document' },
  })

  .post('/:id/send-email', async ({ user, status, params }) => {
    try {
      const result = await sendDocumentEmail(user.id, params.id)
      if (result.status === 'no_client_email') {
        return status(400, { message: 'This document has no client email on file' })
      }

      return { emailStatus: result.status, sentAt: result.sentAt }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    detail: { tags: ['Documents'], summary: 'Email the document to its client (initial send or resend)' },
  })

  .post('/:id/send-etax', async ({ user, status, params }) => {
    try {
      const result = await sendDocumentEtax(user.id, params.id)
      if (result.status === 'no_client_email') {
        return status(400, { message: 'ETAX_NO_CLIENT_EMAIL: This document has no client email on file' })
      }
      if (result.status === 'wrong_document_type') {
        return status(400, { message: 'ETAX_WRONG_TYPE: e-Tax Invoice by Email is only available for tax invoices (INV)' })
      }
      if (result.status === 'not_published') {
        return status(400, { message: 'ETAX_NOT_PUBLISHED: Document must be published before it can be sent via e-Tax' })
      }
      if (result.status === 'region_not_supported') {
        return status(403, { message: 'ETAX_THAILAND_ONLY: e-Tax Invoice by Email is only available in Thailand' })
      }
      if (result.status === 'not_enabled') {
        return status(409, { message: 'ETAX_NOT_ENABLED: e-Tax Invoice by Email is not enabled for this sender profile' })
      }
      if (result.status === 'attachment_too_large') {
        return status(400, { message: 'ETAX_PDF_TOO_LARGE: The PDF exceeds the 3 MB limit ETDA accepts' })
      }
      if (result.status === 'pdf_not_ready') {
        return status(409, { message: `ETAX_PDF_NOT_READY:${result.pdfState}` })
      }
      return { emailStatus: result.status, sentAt: result.sentAt }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    detail: { tags: ['Documents'], summary: 'Send a published tax invoice via ETDA e-Tax Invoice by Email (time-stamp)' },
  })

  .post('/:id/public-link/revoke', async ({ user, status, params }) => {
    try {
      return await revokeDocumentPublicLink(user.id, params.id)
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      return status(500, { message: 'Could not revoke public link' })
    }
  }, {
    auth: true,
    response: { 200: DocumentWire, 404: NotFoundResponse, 500: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Revoke the current public document link' },
  })

  .post('/:id/public-link/rotate', async ({ user, status, params }) => {
    try {
      return await rotateDocumentPublicLink(user.id, params.id)
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      return status(500, { message: 'Could not rotate public link' })
    }
  }, {
    auth: true,
    response: { 200: DocumentWire, 404: NotFoundResponse, 500: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Rotate the public document link and invalidate the previous token' },
  })

  .post('/:id/promote', async ({ user, status, params, body }) => {
    try {
      const doc = await promote(user.id, params.id, body)
      return status(201, doc)
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    body: PromoteDocumentBody,
    detail: { tags: ['Documents'], summary: 'Promote document to next type' },
  })

  .post('/:id/link-transaction', async ({ user, status, params, body }) => {
    try {
      await getDocument(user.id, params.id)
      const tx = await getTransaction(user.id, body.transactionId)
      if (!tx) return status(404, { message: 'Transaction not found' })

      const result = await reconcile(user.id, params.id, body.transactionId)
      const document = await getDocument(user.id, params.id)
      return { document, transaction: toTx(result.transaction), warning: result.warning }
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    body: LinkTransactionBody,
    detail: { tags: ['Documents'], summary: 'Link an existing transaction to this document (manual reconciliation)' },
  })

  .post('/:id/unlink-transaction', async ({ user, status, params }) => {
    try {
      const document = await unlinkDocumentTransaction(user.id, params.id)
      return { document }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    detail: { tags: ['Documents'], summary: 'Unlink the transaction reconciled against this document' },
  })

  .get('/:id/versions', async ({ user, status, params }) => {
    try {
      return await listVersions(user.id, params.id)
    } catch {
      return status(404, { message: 'Not found' })
    }
  }, {
    auth: true,
    response: { 200: DocumentVersionsListResponse, 404: NotFoundResponse },
    detail: { tags: ['Documents'], summary: 'List document versions' },
  })

  .get('/:id/pdf', async ({ user, status, params }) => {
    try {
      const result = await getDocumentPdfUrl(user.id, params.id)
      if (result === 'generating') return status(202, { status: 'generating' })
      if (result === 'failed') return { status: 'failed', message: 'PDF generation failed' }
      return { url: result }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(500, { message: msg })
    }
  }, {
    auth: true,
    detail: { tags: ['Documents'], summary: 'Get signed PDF download URL for document (owner only)' },
  })

  .post('/:id/image/:kind', async ({ user, status, params, body }) => {
    if (!env.R2_ACCESS_KEY_ID) return status(503, { error: 'R2 not configured' })
    if (params.kind !== 'logo' && params.kind !== 'signature') {
      return status(400, { message: 'Invalid image kind' })
    }
    try {
      const doc = await setDocumentImage(user.id, params.id, params.kind, body.data, body.mediaType)
      if (!doc) return status(404, { message: 'Not found' })
      return doc
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed'
      return status(400, { message })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String(), kind: t.String() }),
    // ~1.4x a 5MB binary cap — base64 inflates size by ~1.33x
    body: t.Object({ data: t.String({ maxLength: 7 * 1024 * 1024 }), mediaType: t.String() }),
    response: { 200: DocumentWire, 400: MessageResponse, 404: NotFoundResponse, 413: ErrorResponse, 503: ErrorResponse },
    detail: { tags: ['Documents'], summary: 'Upload document logo or signature image' },
  })

  .delete('/:id/image/:kind', async ({ user, status, params }) => {
    if (params.kind !== 'logo' && params.kind !== 'signature') {
      return status(400, { message: 'Invalid image kind' })
    }
    const doc = await clearDocumentImage(user.id, params.id, params.kind)
    if (!doc) return status(404, { message: 'Not found' })
    return doc
  }, {
    auth: true,
    params: t.Object({ id: t.String(), kind: t.String() }),
    response: { 200: DocumentWire, 400: MessageResponse, 404: NotFoundResponse },
    detail: { tags: ['Documents'], summary: 'Remove document logo or signature image' },
  })

  .post('/cron/generate-recurring', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized
    const generated = await generateRecurringDocuments()
    return { generated: generated.length }
  }, { detail: { tags: ['Documents'], summary: 'Cron: generate draft documents from recurring templates', hide: true } })

  .get('/project/:projectId/items', async ({ user, params }) => {
    return listDocumentsByProject(user.id, params.projectId)
  }, { auth: true, response: { 200: DocumentsByProjectResponse }, detail: { tags: ['Documents'], summary: 'List project documents with items for import picker' } })

  .get('/view/:token', async ({ status, params, request, set, user }) => {
    setPublicDocumentHeaders(set.headers)
    if (!hitRateLimit(`public-document-read:${clientIp(request)}`, 30, 60_000)) {
      return status(429, { message: 'Too many document requests — try again later' })
    }
    const doc = await getDocumentByPublicToken(params.token, user?.id)
    if (!doc) return status(404, { message: 'Not found' })
    return doc
  }, { optionalAuth: true, response: { 200: GuestDocumentWire, 404: NotFoundResponse, 429: MessageResponse }, detail: { tags: ['Documents'], summary: 'Get document by public token (guest)' } })

  .patch('/view/:token/viewed', async ({ status, params, request, set, user }) => {
    setPublicDocumentHeaders(set.headers)
    if (!hitRateLimit(`public-document-viewed:${params.token}:${clientIp(request)}`, 10, 60 * 60_000)) {
      return status(429, { message: 'Too many view updates — try again later' })
    }
    const ok = await markDocumentViewed(params.token, user?.id)
    if (!ok) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { optionalAuth: true, response: { 204: NoContentResponse, 404: NotFoundResponse, 429: MessageResponse }, detail: { tags: ['Documents'], summary: 'Mark document as viewed by client' } })

  .post('/view/:token/approve', async ({ status, params, request, set }) => {
    setPublicDocumentHeaders(set.headers)
    const ip = clientIp(request)
    if (!hitRateLimit(`public-document-action:${params.token}:${ip}`, 5, 60 * 60_000)) {
      return status(429, { message: 'Too many document actions — try again later' })
    }
    const ok = await approveDocumentByToken(params.token, ip)
    if (!ok) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { response: { 204: NoContentResponse, 404: NotFoundResponse, 429: MessageResponse }, detail: { tags: ['Documents'], summary: 'Client approves document via public token' } })

  .post('/view/:token/reject', async ({ status, params, request, set }) => {
    setPublicDocumentHeaders(set.headers)
    if (!hitRateLimit(`public-document-action:${params.token}:${clientIp(request)}`, 5, 60 * 60_000)) {
      return status(429, { message: 'Too many document actions — try again later' })
    }
    const ok = await rejectDocumentByToken(params.token)
    if (!ok) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { response: { 204: NoContentResponse, 404: NotFoundResponse, 429: MessageResponse }, detail: { tags: ['Documents'], summary: 'Client rejects document via public token' } })

  .get('/view/:token/pdf', async ({ status, params, request, set }) => {
    setPublicDocumentHeaders(set.headers)
    if (!hitRateLimit(`public-document-pdf:${params.token}:${clientIp(request)}`, 20, 60 * 60_000)) {
      return status(429, { message: 'Too many PDF requests — try again later' })
    }
    try {
      const result = await getDocumentPdfUrlByToken(params.token)
      if (result === 'generating') return status(202, { status: 'generating' })
      if (result === 'failed') return status(500, { status: 'failed', message: 'PDF generation failed' })
      return { url: result }
    } catch (err) {
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(500, { message: msg })
    }
  }, {
    response: {
      200: t.Object({ url: t.Nullable(t.String()) }),
      202: t.Object({ status: t.Literal('generating') }),
      404: NotFoundResponse,
      429: MessageResponse,
      500: t.Union([
        MessageResponse,
        t.Object({ status: t.Literal('failed'), message: t.String() }),
      ]),
    },
    detail: { tags: ['Documents'], summary: 'Get signed PDF download URL by public token (guest)' },
  })
