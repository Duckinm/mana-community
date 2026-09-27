import Elysia, { t } from 'elysia'
import { env } from '@api/env'

export const capabilitiesModule = new Elysia({ name: 'capabilities' })
  .get('/api/capabilities', ({ set }) => {
    set.headers['cache-control'] = 'no-store'
    return {
      ai: Boolean(env.ANTHROPIC_API_KEY),
      transcription: Boolean(env.GROQ_API_KEY),
      socialProviders: {
        google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        discord: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
        facebook: Boolean(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET),
      },
      googleCalendar: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      line: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_CHANNEL_SECRET && env.LINE_OA_ID),
      push: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT),
      email: env.MAILPIT_URL ? 'local' as const : env.RESEND_API_KEY ? 'resend' as const : 'disabled' as const,
      paymentSlipVerification: Boolean(env.THUNDER_API_KEY),
    }
  }, {
    response: { 200: t.Object({
      ai: t.Boolean(),
      transcription: t.Boolean(),
      socialProviders: t.Object({ google: t.Boolean(), discord: t.Boolean(), facebook: t.Boolean() }),
      googleCalendar: t.Boolean(),
      line: t.Boolean(),
      push: t.Boolean(),
      email: t.Union([t.Literal('local'), t.Literal('resend'), t.Literal('disabled')]),
      paymentSlipVerification: t.Boolean(),
    }) },
    detail: { tags: ['Configuration'], summary: 'Optional provider configuration (not a health check)' },
  })
