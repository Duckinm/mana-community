import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { generateTasksFromBrief, generateOutreachDraft, generateFinanceNarrative, breakDownTask, queryContacts, aiErrorMessage } from '@api/modules/ai/service'
import {
  GenerateTasksResponse,
  OutreachDraftResponse,
  BreakDownTaskResponse,
  ContactsQueryResponse,
  FinanceNarrativeResponse,
  MessageResponse,
} from '@api/modules/ai/responses'

export const aiModule = new Elysia({ name: 'ai', prefix: '/api/ai' })
  .use(betterAuthPlugin)

  .post(
    '/generate-tasks',
    async ({ user, body, status }) => {
      try {
        const tasks = await generateTasksFromBrief(user.id, body.projectId, body.brief)
        return tasks
      } catch (err) {
        const message = aiErrorMessage(err)
        if (message === 'Project not found') return status(404, { message })
        return status(500, { message })
      }
    },
    {
      auth: true,
      body: t.Object({
        projectId: t.String(),
        brief: t.String({ minLength: 10 }),
      }),
      response: { 200: GenerateTasksResponse, 404: MessageResponse, 500: MessageResponse },
      detail: { tags: ['AI'], summary: 'Generate tasks from a project brief' },
    },
  )

  .post(
    '/outreach-draft',
    async ({ user, body, status }) => {
      try {
        const draft = await generateOutreachDraft(user.id, body.contactName, body.purpose, body.context ?? '')
        return draft
      } catch (err) {
        return status(500, { message: aiErrorMessage(err) })
      }
    },
    {
      auth: true,
      body: t.Object({
        contactName: t.String(),
        purpose: t.String({ minLength: 5 }),
        context: t.Optional(t.String()),
      }),
      response: { 200: OutreachDraftResponse, 500: MessageResponse },
      detail: { tags: ['AI'], summary: 'Generate an outreach email draft for a contact' },
    },
  )

  .post(
    '/break-down-task',
    async ({ user, body, status }) => {
      try {
        const items = await breakDownTask(user.id, body.taskTitle, body.taskDescription ?? '')
        return items
      } catch (err) {
        return status(500, { message: aiErrorMessage(err) })
      }
    },
    {
      auth: true,
      body: t.Object({
        taskTitle: t.String({ minLength: 2 }),
        taskDescription: t.Optional(t.String()),
      }),
      response: { 200: BreakDownTaskResponse, 500: MessageResponse },
      detail: { tags: ['AI'], summary: 'Break a task into subtask checklist items' },
    },
  )

  .post(
    '/contacts-query',
    async ({ body, user, status }) => {
      try {
        const answer = await queryContacts(user.id, body.question)
        return { answer }
      } catch (e) {
        return status(500, { message: aiErrorMessage(e) })
      }
    },
    {
      auth: true,
      body: t.Object({ question: t.String() }),
      response: { 200: ContactsQueryResponse, 500: MessageResponse },
      detail: { tags: ['AI'], summary: 'Query contacts using natural language' },
    },
  )

  .get(
    '/finance-narrative',
    async ({ user, status }) => {
      try {
        const narrative = await generateFinanceNarrative(user.id)
        return narrative
      } catch (err) {
        return status(500, { message: aiErrorMessage(err) })
      }
    },
    {
      auth: true,
      response: { 200: FinanceNarrativeResponse, 500: MessageResponse },
      detail: { tags: ['AI'], summary: 'Generate AI financial health narrative' },
    },
  )
