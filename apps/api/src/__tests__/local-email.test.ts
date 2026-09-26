import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { env } from '@api/env'

const original = { ...env }
const requests: { path: string; body: unknown }[] = []
let reply = () => Response.json({ ID: 'local-message' })
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    requests.push({ path: new URL(request.url).pathname, body: await request.json() })
    return reply()
  },
})
const email = { to: 'recipient@example.test', subject: 'Local test', html: '<p>Full HTML</p>' }

beforeEach(() => {
  env.NODE_ENV = 'development'
  env.RESEND_API_KEY = undefined
  env.MAILPIT_URL = undefined
  env.EMAIL_SANDBOX_WHITELIST = ''
  env.RESEND_FROM_EMAIL = 'MANA <sender@example.test>'
  requests.length = 0
  reply = () => Response.json({ ID: 'local-message' })
})

afterEach(() => {
  mock.restore()
  Object.assign(env, original)
})

afterAll(() => server.stop(true))

function loadEmail() {
  return import(`@api/utils/email/index.ts?local-email=${crypto.randomUUID()}`)
}

describe('local email delivery', () => {
  it('boots without a provider and reports failure without network access', async () => {
    const network = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'))
    const { sendEmailSingle, sendEmailBatch } = await loadEmail()
    expect(await sendEmailSingle(email)).toMatchObject({ status: 'failed', error: expect.stringContaining('Email is not configured') })
    expect(await sendEmailBatch([email])).toEqual([
      { to: email.to, status: 'failed', error: 'Email is not configured. Set MAILPIT_URL or RESEND_API_KEY.' },
    ])
    expect(network).not.toHaveBeenCalled()
  })

  it('captures HTML, attachment bytes, and all CC locally even when Resend is configured', async () => {
    env.MAILPIT_URL = server.url.toString()
    env.RESEND_API_KEY = 'unused-test-resend-key'
    const { sendEmailSingle } = await loadEmail()
    const content = Buffer.from([0, 1, 128, 255])
    expect(await sendEmailSingle({
      ...email,
      from: '"Sender Name" <sender@example.test>',
      cc: ['Other Person <other@example.test>', 'unlisted@example.test'],
      attachments: [{ filename: 'proof.pdf', content }],
    })).toEqual({ to: email.to, status: 'sent' })
    expect(requests).toEqual([{
      path: '/api/v1/send',
      body: {
        From: { Name: 'Sender Name', Email: 'sender@example.test' },
        To: [{ Email: email.to }],
        Cc: [{ Name: 'Other Person', Email: 'other@example.test' }, { Email: 'unlisted@example.test' }],
        Subject: email.subject,
        HTML: email.html,
        Attachments: [{ Filename: 'proof.pdf', Content: content.toString('base64') }],
      },
    }])
  })

  it('preserves batch recipient ordering and does not fall back after capture fails', async () => {
    env.MAILPIT_URL = server.url.toString()
    env.RESEND_API_KEY = 'unused-test-resend-key'
    reply = () => requests.length === 1
      ? Response.json({ Error: 'capture failed' }, { status: 503 })
      : Response.json({ ID: 'captured-second' })
    const { sendEmailBatch } = await loadEmail()
    expect(await sendEmailBatch([email, { ...email, to: 'second@example.test' }])).toEqual([
      { to: email.to, status: 'failed', error: 'Mailpit rejected email (HTTP 503)' },
      { to: 'second@example.test', status: 'sent' },
    ])
    expect(requests).toHaveLength(2)
  })

  it('does not report capture success without a message ID', async () => {
    env.MAILPIT_URL = server.url.toString()
    reply = () => Response.json({})
    const { sendEmailSingle } = await loadEmail()
    expect(await sendEmailSingle(email)).toEqual({ to: email.to, status: 'failed', error: 'Mailpit returned no message ID' })
  })

  it('reports transport errors and required auth email failures', async () => {
    env.MAILPIT_URL = server.url.toString()
    env.RESEND_API_KEY = 'unused-test-resend-key'
    spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Mailpit is unavailable'))
    const { sendEmailSingle } = await loadEmail()
    expect(await sendEmailSingle(email)).toMatchObject({ status: 'failed', error: 'Mailpit is unavailable' })
    const { sendVerificationEmail } = await import('@api/utils/email/resend')
    await expect(sendVerificationEmail({ to: email.to, name: 'Test', verificationUrl: 'http://localhost/verify' })).rejects.toThrow('Mailpit is unavailable')
    const { auth } = await import('@api/auth')
    await expect(auth.options.emailVerification!.sendVerificationEmail!({
      user: { id: 'test', name: 'Test', email: email.to, emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      url: 'http://localhost:4000/api/auth/verify-email?token=test',
      token: 'test',
    })).rejects.toThrow('Mailpit is unavailable')
    env.MAILPIT_URL = undefined
    await expect(sendVerificationEmail({ to: email.to, name: 'Test', verificationUrl: 'http://localhost/verify' })).rejects.toThrow('blocked')
    await expect(auth.options.emailVerification!.sendVerificationEmail!({
      user: { id: 'test', name: 'Test', email: email.to, emailVerified: false, createdAt: new Date(), updatedAt: new Date() },
      url: 'http://localhost:4000/api/auth/verify-email?token=test',
      token: 'test',
    })).rejects.toThrow('blocked')
  })
})
