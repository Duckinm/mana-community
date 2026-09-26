import { t } from 'elysia'

export const TranscribeBody = t.Object({
  // Groq's own Whisper endpoint hard-rejects anything larger anyway
  file: t.File({ maxSize: '25m' }),
  language: t.Optional(t.String()),
})
