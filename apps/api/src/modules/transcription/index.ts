import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import { transcribeAudio } from '@api/modules/transcription/service'
import { TranscribeBody } from '@api/modules/transcription/model'
import { TranscriptionResponse } from '@api/modules/transcription/responses'
import { ErrorResponse } from '@api/lib/wire-schema'
import { hitRateLimit } from '@api/lib/rate-limiter'

export const transcriptionModule = new Elysia({ name: 'transcription', prefix: '/api' })
  .use(betterAuthPlugin)

  .post('/transcription', async ({ status, user, body }) => {
    if (!env.GROQ_API_KEY) return status(503, { error: 'Voice transcription not configured' })
    if (!hitRateLimit(`transcription:${user.id}`, 10, 60_000)) {
      return status(429, { error: 'Too many transcription requests — try again in a minute' })
    }
    const text = await transcribeAudio(body.file, body.language)
    return { text }
  }, {
    auth: true,
    body: TranscribeBody,
    response: { 200: TranscriptionResponse, 429: ErrorResponse, 503: ErrorResponse },
    detail: { tags: ['Transcription'], summary: 'Transcribe audio to text for voice input' },
  })
