import { t } from 'elysia'

export const EmailResultResponse = t.Object({
  to: t.String(),
  status: t.Union([t.Literal('sent'), t.Literal('blocked'), t.Literal('failed')]),
  resendId: t.Optional(t.String()),
  error: t.Optional(t.String()),
})

export const SendRemindersResponse = t.Object({
  results: t.Array(EmailResultResponse),
})
