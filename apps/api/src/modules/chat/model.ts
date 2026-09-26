import { t } from 'elysia'

export const ChatLocale = t.Union([t.Literal('en'), t.Literal('th')])

export const SendMessageBody = t.Object({
  message: t.String({ minLength: 1 }),
  sessionId: t.String(),
  locale: t.Optional(ChatLocale),
  files: t.Optional(t.Array(t.Object({
    name: t.String(),
    mediaType: t.String(),
    data: t.String(),
    isImage: t.Boolean(),
  }))),
})

export const CreateSessionBody = t.Object({
  title: t.Optional(t.String()),
})

export const UpdateSessionTitleBody = t.Object({
  title: t.String({ minLength: 1 }),
})

export const UpdateSessionPinnedBody = t.Object({
  pinned: t.Boolean(),
})
