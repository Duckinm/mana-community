import { t } from 'elysia'

export const SendRemindersBody = t.Object({
  documentIds: t.Array(t.String(), { minItems: 1, maxItems: 100 }),
})
