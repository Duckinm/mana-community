import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { uploadPaymentSlip, confirmPaymentSlip, dismissPaymentSlip, resolveDocumentIdByToken, verifyPaymentSlipWithProvider } from '@api/modules/payment-slips/service'
import { PaymentSlipUploadBody, PaymentSlipConfirmBody } from '@api/modules/payment-slips/model'
import { PaymentSlipUploadResponse, PaymentSlipDismissResponse } from '@api/modules/payment-slips/responses'
import { NotFoundResponse, MessageResponse } from '@api/lib/wire-schema'
import { mapRouteError, ConflictError } from '@api/lib/errors'
import { hitRateLimit, clientIp } from '@api/lib/rate-limiter'
import { getDocument } from '@api/modules/documents/service'
import { DocumentWire } from '@api/modules/documents/responses'
import { toTx } from '@api/modules/finance/service'
import { TransactionResponse } from '@api/modules/finance/responses'

function setGuestDocumentHeaders(headers: { [key: string]: string | number | undefined }) {
  headers['cache-control'] = 'private, no-store'
  headers['referrer-policy'] = 'no-referrer'
  headers['x-robots-tag'] = 'noindex, nofollow, noarchive'
}

const PaymentSlipConfirmResponse = t.Object({
  document: DocumentWire,
  transaction: TransactionResponse,
  warning: t.Optional(t.String()),
})

const ConflictResponse = t.Object({
  message: t.String(),
  code: t.Optional(t.String()),
})

export const paymentSlipsModule = new Elysia({ name: 'payment-slips', prefix: '/api/documents' })
  .use(betterAuthPlugin)

  .post('/:id/payment-slip', async ({ user, status, params, body }) => {
    try {
      const paymentSlip = await uploadPaymentSlip({ documentId: params.id, file: body.file, source: 'owner', ownerUserId: user.id })
      return status(201, { paymentSlip })
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: PaymentSlipUploadBody,
    response: { 201: PaymentSlipUploadResponse, 400: MessageResponse, 404: NotFoundResponse, 409: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Upload a PromptPay payment slip for this document (owner)' },
  })

  .post('/view/:token/payment-slip', async ({ status, params, body, request, set }) => {
    setGuestDocumentHeaders(set.headers)
    if (!hitRateLimit(`slip-upload:${params.token}:${clientIp(request)}`, 5, 60 * 60_000)) {
      return status(429, { message: 'Too many upload attempts — try again later' })
    }
    try {
      const documentId = await resolveDocumentIdByToken(params.token)
      if (!documentId) return status(404, { message: 'Not found' })
      const paymentSlip = await uploadPaymentSlip({ documentId, file: body.file, source: 'guest' })
      return status(201, { paymentSlip })
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    params: t.Object({ token: t.String() }),
    body: PaymentSlipUploadBody,
    response: { 201: PaymentSlipUploadResponse, 400: MessageResponse, 404: NotFoundResponse, 409: MessageResponse, 429: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Upload a PromptPay payment slip by public token (guest)' },
  })

  .post('/:id/payment-slip/:slipId/confirm', async ({ user, status, params, body }) => {
    try {
      const result = await confirmPaymentSlip(user.id, params.id, params.slipId, body?.allowUnverified ?? false)
      const document = await getDocument(user.id, params.id)
      return { document, transaction: toTx(result.transaction), warning: result.warning }
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message, code: err.code })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String(), slipId: t.String() }),
    body: PaymentSlipConfirmBody,
    response: { 200: PaymentSlipConfirmResponse, 400: MessageResponse, 404: NotFoundResponse, 409: ConflictResponse },
    detail: { tags: ['Documents'], summary: 'Confirm a proposed payment slip and reconcile it against this document' },
  })

  .post('/:id/payment-slip/:slipId/verify', async ({ user, status, params }) => {
    try {
      const paymentSlip = await verifyPaymentSlipWithProvider(user.id, params.id, params.slipId)
      return { paymentSlip }
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String(), slipId: t.String() }),
    response: { 200: PaymentSlipDismissResponse, 400: MessageResponse, 404: NotFoundResponse, 409: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Run a real bank-side verification (Thunder Solution) against a proposed payment slip — paid plans only' },
  })

  .post('/:id/payment-slip/:slipId/dismiss', async ({ user, status, params }) => {
    try {
      const paymentSlip = await dismissPaymentSlip(user.id, params.id, params.slipId)
      return { paymentSlip }
    } catch (err) {
      if (err instanceof ConflictError) return status(409, { message: err.message })
      const mapped = mapRouteError(err)
      if (mapped?.status === 404) return status(404, { message: mapped.message })
      const msg = err instanceof Error ? err.message : 'Internal error'
      return status(400, { message: msg })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String(), slipId: t.String() }),
    response: { 200: PaymentSlipDismissResponse, 400: MessageResponse, 404: NotFoundResponse, 409: MessageResponse },
    detail: { tags: ['Documents'], summary: 'Dismiss a proposed payment slip' },
  })
