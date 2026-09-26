import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import {
  buildChatStream,
} from '@api/modules/chat/service'
import {
  getChatHistory,
  clearChatHistory,
  getSessions,
  createSession,
  deleteSession,
  updateSessionTitle,
  updateSessionPinned,
  getSessionMessages,
  searchSessions,
} from '@api/modules/chat/sessions'
import { SendMessageBody, CreateSessionBody, UpdateSessionTitleBody, UpdateSessionPinnedBody } from '@api/modules/chat/model'
import {
  ChatMessagesListResponse,
  ChatSessionsListResponse,
  ChatSessionCreatedResponse,
  ChatSessionTitleResponse,
  ChatSessionPinnedResponse,
  ChatSessionSearchResultsResponse,
  NotFoundResponse,
  SuccessResponse,
} from '@api/modules/chat/responses'

export const chatModule = new Elysia({ name: 'chat', prefix: '/api/chat' })
  .use(betterAuthPlugin)

  .get('/history', async ({ user }) => {
    return getChatHistory(user.id)
  }, {
    auth: true,
    response: { 200: ChatMessagesListResponse },
    detail: { tags: ['Chat'], summary: 'Get chat history' },
  })

  .delete('/history', async ({ user }) => {
    await clearChatHistory(user.id)
    return { success: true }
  }, {
    auth: true,
    response: { 200: SuccessResponse },
    detail: { tags: ['Chat'], summary: 'Clear chat history' },
  })

  .get('/sessions', async ({ user }) => {
    return getSessions(user.id)
  }, {
    auth: true,
    response: { 200: ChatSessionsListResponse },
    detail: { tags: ['Chat'], summary: 'List chat sessions' },
  })

  .get('/sessions/search', async ({ user, query }) => {
    const q = (query as Record<string, string>).q ?? ''
    if (!q || q.trim().length < 2) return []
    return searchSessions(user.id, q.trim())
  }, { auth: true, response: { 200: ChatSessionSearchResultsResponse }, detail: { tags: ['Chat'], summary: 'Search sessions by message content' } })

  .post('/sessions', async ({ user, body, status }) => {
    const session = await createSession(user.id, body.title)
    return status(201, session)
  }, {
    auth: true,
    body: CreateSessionBody,
    response: { 201: ChatSessionCreatedResponse },
    detail: { tags: ['Chat'], summary: 'Create a new chat session' },
  })

  .delete('/sessions/:sessionId', async ({ user, params, status }) => {
    const result = await deleteSession(user.id, params.sessionId)
    if (!result) return status(404, { message: 'Session not found' })
    return result
  }, {
    auth: true,
    response: { 200: SuccessResponse, 404: NotFoundResponse },
    detail: { tags: ['Chat'], summary: 'Delete a chat session' },
  })

  .patch('/sessions/:sessionId/title', async ({ user, params, body, status }) => {
    const result = await updateSessionTitle(user.id, params.sessionId, body.title)
    if (!result) return status(404, { message: 'Session not found' })
    return result
  }, {
    auth: true,
    body: UpdateSessionTitleBody,
    response: { 200: ChatSessionTitleResponse, 404: NotFoundResponse },
    detail: { tags: ['Chat'], summary: 'Rename a chat session' },
  })

  .patch('/sessions/:sessionId/pinned', async ({ user, params, body, status }) => {
    const result = await updateSessionPinned(user.id, params.sessionId, body.pinned)
    if (!result) return status(404, { message: 'Session not found' })
    return result
  }, {
    auth: true,
    body: UpdateSessionPinnedBody,
    response: { 200: ChatSessionPinnedResponse, 404: NotFoundResponse },
    detail: { tags: ['Chat'], summary: 'Pin or unpin a chat session' },
  })

  .get('/sessions/:sessionId/messages', async ({ user, params, status }) => {
    const result = await getSessionMessages(user.id, params.sessionId)
    if (!result) return status(404, { message: 'Session not found' })
    return result
  }, {
    auth: true,
    response: { 200: ChatMessagesListResponse, 404: NotFoundResponse },
    detail: { tags: ['Chat'], summary: 'Get messages for a session' },
  })

  .post('/', async ({ user, status, body, request }) => {
    let stream: ReadableStream
    try {
      stream = await buildChatStream(
        user.id,
        body.sessionId,
        body.message,
        body.files,
        body.locale,
        request.signal,
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg === 'Session not found') return status(404, { message: msg })
      return status(500, { message: msg })
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }, {
    auth: true,
    body: SendMessageBody,
    detail: { tags: ['Chat'], summary: 'Send message (SSE streaming)' },
  })
