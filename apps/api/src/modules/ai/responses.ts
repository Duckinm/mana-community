import { t } from 'elysia'
import { MessageResponse } from '@api/lib/wire-schema'

export const GeneratedTaskResponse = t.Object({
  title: t.String(),
  priority: t.Union([t.Literal('low'), t.Literal('med'), t.Literal('high')]),
  status: t.Union([t.Literal('todo'), t.Literal('in-progress')]),
  due: t.String(),
})

export const GenerateTasksResponse = t.Array(GeneratedTaskResponse)

export const OutreachDraftResponse = t.Object({
  subject: t.String(),
  body: t.String(),
})

export const ChecklistItemResponse = t.Object({
  id: t.String(),
  text: t.String(),
  done: t.Boolean(),
})

export const BreakDownTaskResponse = t.Array(ChecklistItemResponse)

export const ContactsQueryResponse = t.Object({
  answer: t.String(),
})

export const FinanceNarrativeResponse = t.Object({
  headline: t.String(),
  narrative: t.String(),
  insights: t.Array(t.String()),
})

export { MessageResponse }
