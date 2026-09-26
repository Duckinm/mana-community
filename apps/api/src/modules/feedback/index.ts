import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { createFeedback, feedbackMetrics, listFeedback, patchFeedback } from '@api/modules/feedback/service'
import { prioritizeAllFeedback } from '@api/modules/feedback/prioritize'
import {
  CreateFeedbackBody,
  FeedbackListResponse,
  FeedbackMetricsResponse,
  FeedbackResponse,
  ListFeedbackQuery,
  NotFoundResponse,
  PrioritizeResponse,
  UpdateFeedbackBody,
} from '@api/modules/feedback/model'

export const feedbackModule = new Elysia({ name: 'feedback', prefix: '/api/feedback' })
  .use(betterAuthPlugin)

  .get('/', async ({ query }) => {
    return listFeedback(query)
  }, {
    admin: true,
    query: ListFeedbackQuery,
    response: { 200: FeedbackListResponse },
    detail: { tags: ['Feedback'], summary: 'List feedback (search, filters, pagination)' },
  })

  .post('/', async ({ user, status, body, request }) => {
    const created = await createFeedback(user.id, body, request.headers.get('user-agent'))
    return status(201, created)
  }, {
    auth: true,
    body: CreateFeedbackBody,
    response: { 201: FeedbackResponse },
    detail: { tags: ['Feedback'], summary: 'Submit feedback' },
  })

  .get('/metrics', async () => {
    return feedbackMetrics()
  }, {
    admin: true,
    response: { 200: FeedbackMetricsResponse },
    detail: { tags: ['Feedback'], summary: 'Daily feedback metrics' },
  })

  .post('/prioritize', async () => {
    const { updated, created, split } = await prioritizeAllFeedback()
    return { updated, created, split }
  }, {
    admin: true,
    response: { 200: PrioritizeResponse },
    detail: { tags: ['Feedback'], summary: 'AI-prioritize open feedback' },
  })

  .patch('/:id', async ({ status, params, body }) => {
    const updated = await patchFeedback(params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    admin: true,
    body: UpdateFeedbackBody,
    response: { 200: FeedbackResponse, 404: NotFoundResponse },
    detail: { tags: ['Feedback'], summary: 'Update feedback (status, severity)' },
  })
