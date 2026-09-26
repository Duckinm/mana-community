import { t } from 'elysia'

export const PaymentSlipUploadBody = t.Object({
  file: t.File({ maxSize: '10m' }),
})

export const PaymentSlipConfirmBody = t.Optional(t.Object({
  allowUnverified: t.Optional(t.Boolean()),
}))
