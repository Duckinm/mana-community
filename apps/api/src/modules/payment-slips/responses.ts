import { t } from 'elysia'
import { NullableString } from '@api/lib/wire-schema'

export const PaymentSlipWire = t.Object({
  id: t.String(),
  documentId: t.String(),
  source: t.Union([t.Literal('guest'), t.Literal('owner')]),
  status: t.Union([
    t.Literal('proposed'),
    t.Literal('mismatched'),
    t.Literal('confirmed'),
    t.Literal('dismissed'),
    t.Literal('failed'),
  ]),
  extractedAmountCents: t.Union([t.Number(), t.Null()]),
  extractedCurrency: NullableString,
  extractedDate: NullableString,
  mismatchWarning: NullableString,
  aiUncertain: t.Boolean(),
  fileUrl: NullableString,
  createdAt: t.String(),
  qrFound: t.Boolean(),
  qrWarning: NullableString,
  apiVerified: t.Boolean(),
  apiVerificationProvider: NullableString,
  apiVerifiedAt: NullableString,
})

export const PaymentSlipUploadResponse = t.Object({
  paymentSlip: PaymentSlipWire,
})

export const PaymentSlipDismissResponse = t.Object({
  paymentSlip: PaymentSlipWire,
})
