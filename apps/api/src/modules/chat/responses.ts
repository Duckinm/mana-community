import { t } from 'elysia'
import { IsoInstant, NullableIsoInstant, NotFoundResponse, SuccessResponse } from '@api/lib/wire-schema'

export const ChatMessageResponse = t.Object({
  id: t.String(),
  role: t.String(),
  content: t.String(),
  toolCalls: t.Union([t.Any(), t.Null()]),
  toolResults: t.Union([t.Any(), t.Null()]),
  createdAt: IsoInstant,
})

export const ChatSessionResponse = t.Object({
  id: t.String(),
  title: t.String(),
  titleGeneratedAt: NullableIsoInstant,
  pinned: t.Boolean(),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
  messageCount: t.Number(),
})

export const ChatSessionCreatedResponse = t.Object({
  id: t.String(),
  title: t.String(),
  createdAt: IsoInstant,
})

export const ChatSessionTitleResponse = t.Object({
  id: t.String(),
  title: t.String(),
})

export const ChatSessionPinnedResponse = t.Object({
  id: t.String(),
  pinned: t.Boolean(),
})

export const ChatSessionSearchResultResponse = t.Object({
  sessionId: t.String(),
  sessionTitle: t.String(),
  snippet: t.String(),
  sessionUpdatedAt: IsoInstant,
})

export const ChatSessionSearchResultsResponse = t.Array(ChatSessionSearchResultResponse)

export const ChatMessagesListResponse = t.Array(ChatMessageResponse)
export const ChatSessionsListResponse = t.Array(ChatSessionResponse)

export { NotFoundResponse, SuccessResponse }
