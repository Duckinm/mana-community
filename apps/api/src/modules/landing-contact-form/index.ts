import { t } from 'elysia'
import Elysia from 'elysia'
import { env } from '@api/env'
import { clientIp, hitRateLimit } from '@api/lib/rate-limiter'
import { type EmailPayload, sendEmailBatch } from '@api/utils/email'

type ContactSender = (email: EmailPayload) => Promise<boolean>

const topics = {
  product: 'Product question',
  billing: 'Plans and billing',
  partnership: 'Partnership',
  support: 'Technical support',
  other: 'Other',
} as const

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character)
}

const sendContact = async (email: EmailPayload) => {
  const [result] = await sendEmailBatch([email])
  return result.status !== 'failed'
}

export function createLandingContactFormModule(send: ContactSender = sendContact) {
  return new Elysia().post(
    '/api/contact',
    async ({ body, request, set, status }) => {
      const origin = request.headers.get('origin')
      set.headers['cache-control'] = 'no-store'

      if (origin !== env.LANDING_URL) {
        return status(403, { submitted: false, message: 'Origin not allowed' })
      }

      set.headers['access-control-allow-origin'] = origin
      set.headers.vary = 'Origin'

      if (body.website) return status(202, { submitted: true })

      if (!hitRateLimit(`contact:${clientIp(request)}`, 5, 10 * 60_000)) {
        return status(429, { submitted: false, message: 'Too many messages — try again later' })
      }

      const name = escapeHtml(body.name.trim())
      const email = escapeHtml(body.email.trim())
      const message = escapeHtml(body.message.trim()).replace(/\n/g, '<br>')
      const sent = await send({
        to: 'support@heymana.app',
        subject: `Landing contact — ${topics[body.topic]}`,
        html: `<h1>New landing contact</h1><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p><p><strong>Topic:</strong> ${topics[body.topic]}</p><p><strong>Message:</strong></p><p>${message}</p>`,
      })

      if (!sent) return status(503, { submitted: false, message: 'Message delivery failed' })
      return status(202, { submitted: true })
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        email: t.String({ format: 'email', maxLength: 254 }),
        topic: t.Union([
          t.Literal('product'), t.Literal('billing'), t.Literal('partnership'),
          t.Literal('support'), t.Literal('other'),
        ]),
        message: t.String({ minLength: 10, maxLength: 4000 }),
        website: t.Optional(t.String({ maxLength: 200 })),
      }),
      response: {
        202: t.Object({ submitted: t.Literal(true) }),
        403: t.Object({ submitted: t.Literal(false), message: t.String() }),
        429: t.Object({ submitted: t.Literal(false), message: t.String() }),
        503: t.Object({ submitted: t.Literal(false), message: t.String() }),
      },
      detail: { tags: ['Contact'], summary: 'Send a landing-page contact message to MANA support' },
    },
  )
}

export const landingContactFormModule = createLandingContactFormModule()
