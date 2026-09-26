import { t } from 'elysia'
import { NotFoundResponse } from '@api/lib/wire-schema'

export const FeedbackType = t.Union([
  t.Literal('bug'),
  t.Literal('idea'),
  t.Literal('question'),
  t.Literal('other'),
])

export const FeedbackStatus = t.Union([
  t.Literal('new'),
  t.Literal('planned'),
  t.Literal('in_progress'),
  t.Literal('resolved'),
  t.Literal('declined'),
])

export const FeedbackSeverity = t.Union([
  t.Literal('critical'),
  t.Literal('warning'),
  t.Literal('info'),
])

export const FeedbackSource = t.Union([
  t.Literal('web'),
  t.Literal('ios'),
  t.Literal('android'),
  t.Literal('tablet'),
])

export const FeedbackSplitState = t.Union([t.Literal('atomic'), t.Literal('compound')])

export const FeedbackResponse = t.Object({
  id: t.String(),
  parentFeedbackId: t.Nullable(t.String()),
  splitState: t.Nullable(FeedbackSplitState),
  splitPartCount: t.Nullable(t.Number()),
  type: FeedbackType,
  message: t.String(),
  pagePath: t.Nullable(t.String()),
  status: FeedbackStatus,
  severity: t.Nullable(FeedbackSeverity),
  source: t.Nullable(FeedbackSource),
  aiNote: t.Nullable(t.String()),
  score: t.Nullable(t.Number()),
  encounterCount: t.Nullable(t.Number()),
  solutionSummary: t.Nullable(t.String()),
  timeEstimate: t.Nullable(t.String()),
  submitter: t.Nullable(t.Object({ name: t.String(), email: t.String() })),
  lastPrioritizedAt: t.Nullable(t.String()),
  createdAt: t.String(),
  updatedAt: t.String(),
})

export const FeedbackListResponse = t.Object({
  items: t.Array(FeedbackResponse),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
})

export const CreateFeedbackBody = t.Object({
  type: FeedbackType,
  message: t.String({ minLength: 1, maxLength: 4000 }),
  pagePath: t.Optional(t.String({ maxLength: 500 })),
  source: t.Optional(FeedbackSource),
})

export const UpdateFeedbackBody = t.Object({
  status: t.Optional(FeedbackStatus),
  severity: t.Optional(t.Nullable(FeedbackSeverity)),
})

export const ListFeedbackQuery = t.Object({
  q: t.Optional(t.String()),
  status: t.Optional(FeedbackStatus),
  type: t.Optional(FeedbackType),
  severity: t.Optional(FeedbackSeverity),
  source: t.Optional(FeedbackSource),
  page: t.Optional(t.Numeric({ minimum: 1 })),
  pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 500 })),
})

export const PrioritizeResponse = t.Object({
  updated: t.Number(),
  created: t.Number(),
  split: t.Number(),
})

export const FeedbackMetricsResponse = t.Object({
  perDay: t.Array(t.Object({ date: t.String(), count: t.Number() })),
  byType: t.Record(t.String(), t.Number()),
  byStatus: t.Record(t.String(), t.Number()),
  bySeverity: t.Record(t.String(), t.Number()),
  topPages: t.Array(t.Object({ pagePath: t.String(), count: t.Number() })),
  avgResolutionDays: t.Nullable(t.Number()),
  total: t.Number(),
  open: t.Number(),
})

export { NotFoundResponse }
