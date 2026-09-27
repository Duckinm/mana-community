import { afterEach, expect, it, mock, spyOn } from 'bun:test'
import { auth } from '@api/auth'
import { db } from '@api/db'
import { env } from '@api/env'
import { capabilitiesModule } from '@api/modules/capabilities'
import { aiModule } from '@api/modules/ai'
import { chatModule } from '@api/modules/chat'
import * as chatService from '@api/modules/chat/service'
import { financeModule } from '@api/modules/finance'
import { importReceiptTransaction } from '@api/modules/finance/service'
import { lineModule } from '@api/modules/line'
import { startLineConnection } from '@api/modules/line/service'

const initialEnv = { ...env }
const providerKeys = [
  'ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'FACEBOOK_CLIENT_ID', 'FACEBOOK_CLIENT_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'LINE_OA_ID',
  'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
  'MAILPIT_URL', 'RESEND_API_KEY', 'THUNDER_API_KEY',
] as const

afterEach(() => {
  Object.assign(env, initialEnv)
  mock.restore()
})

function signIn() {
  const now = new Date()
  spyOn(auth.api, 'getSession').mockResolvedValue({
    user: { id: 'test-user', name: 'Test', email: 'test@example.test', emailVerified: true, banned: false, twoFactorEnabled: false, createdAt: now, updatedAt: now },
    session: { id: 'test-session', userId: 'test-user', token: 'synthetic-token', expiresAt: now, createdAt: now, updatedAt: now },
  })
}

it('exposes only public configuration flags without auth or provider probes', async () => {
  for (const key of providerKeys) env[key] = undefined
  const network = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'))
  const session = spyOn(auth.api, 'getSession').mockRejectedValue(new Error('Unexpected auth lookup'))
  const response = await capabilitiesModule.handle(new Request('http://localhost/api/capabilities'))
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({
    ai: false, transcription: false, socialProviders: { google: false, discord: false, facebook: false },
    googleCalendar: false, line: false, push: false, email: 'disabled', paymentSlipVerification: false,
  })
  expect(network).not.toHaveBeenCalled()
  expect(session).not.toHaveBeenCalled()

  for (const key of providerKeys) env[key] = 'synthetic-secret'
  env.MAILPIT_URL = 'http://127.0.0.1:1'
  expect(await (await capabilitiesModule.handle(new Request('http://localhost/api/capabilities'))).json()).toEqual({
    ai: true, transcription: true, socialProviders: { google: true, discord: true, facebook: true },
    googleCalendar: true, line: true, push: true, email: 'local', paymentSlipVerification: true,
  })
  env.MAILPIT_URL = undefined
  env.GOOGLE_CLIENT_SECRET = undefined
  env.LINE_OA_ID = undefined
  env.VAPID_SUBJECT = undefined
  const partial = await (await capabilitiesModule.handle(new Request('http://localhost/api/capabilities'))).json()
  expect(partial.email).toBe('resend')
  expect(partial.socialProviders.google).toBe(false)
  expect(partial.googleCalendar).toBe(false)
  expect(partial.line).toBe(false)
  expect(partial.push).toBe(false)
  expect(network).not.toHaveBeenCalled()
})

it('returns typed unavailable responses for chat and every AI route before work begins', async () => {
  signIn()
  env.ANTHROPIC_API_KEY = undefined
  const database = spyOn(db, 'select').mockImplementation(() => { throw new Error('Unexpected database access') })
  const writes = spyOn(db, 'insert').mockImplementation(() => { throw new Error('Unexpected database write') })
  const cases = [
    ['/api/chat/', { sessionId: 'test-session', message: 'Hello' }],
    ['/api/ai/generate-tasks', { projectId: 'test-project', brief: 'Build a useful app' }],
    ['/api/ai/outreach-draft', { contactName: 'Test', purpose: 'Follow up' }],
    ['/api/ai/break-down-task', { taskTitle: 'Build app' }],
    ['/api/ai/contacts-query', { question: 'Who should I contact?' }],
    ['/api/ai/finance-narrative', undefined],
  ] as const
  for (const [path, body] of cases) {
    const app = path.startsWith('/api/chat') ? chatModule : aiModule
    const response = await app.handle(new Request(`http://localhost${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({
      code: 'AI_NOT_CONFIGURED', message: 'AI is not configured. Ask your administrator to configure an AI provider.',
    })
  }
  await expect(importReceiptTransaction('test-user', new File(['receipt'], 'receipt.png', { type: 'image/png' }))).rejects.toThrow('AI is not configured')
  const receipt = new FormData()
  receipt.set('file', new File(['receipt'], 'receipt.png', { type: 'image/png' }))
  const response = await financeModule.handle(new Request('http://localhost/api/finance/transactions/import-receipt', { method: 'POST', body: receipt }))
  expect(response.status).toBe(503)
  expect((await response.json()).code).toBe('AI_NOT_CONFIGURED')
  expect(database).not.toHaveBeenCalled()
  expect(writes).not.toHaveBeenCalled()
})

it('keeps authentication required when optional AI is absent', async () => {
  env.ANTHROPIC_API_KEY = undefined
  spyOn(auth.api, 'getSession').mockResolvedValue(null)
  const response = await aiModule.handle(new Request('http://localhost/api/ai/finance-narrative'))
  expect(response.status).toBe(401)
})

it('does not create a pending LINE link without its official account ID', async () => {
  signIn()
  env.LINE_CHANNEL_ACCESS_TOKEN = 'synthetic-token'
  env.LINE_CHANNEL_SECRET = 'synthetic-secret'
  env.LINE_OA_ID = undefined
  const writes = spyOn(db, 'insert').mockImplementation(() => { throw new Error('Unexpected database write') })
  await expect(startLineConnection('test-user')).rejects.toThrow('LINE is not configured')
  const response = await lineModule.handle(new Request('http://localhost/api/line/connect', { method: 'POST' }))
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'LINE is not configured' })
  expect(writes).not.toHaveBeenCalled()
})

it('preserves configured chat SSE responses', async () => {
  signIn()
  env.ANTHROPIC_API_KEY = 'synthetic-secret'
  const event = 'data: {"type":"done","sessionId":"test-session"}\n\n'
  const stream = spyOn(chatService, 'buildChatStream').mockResolvedValue(new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(event))
      controller.close()
    },
  }))
  const response = await chatModule.handle(new Request('http://localhost/api/chat/', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: 'test-session', message: 'Hello' }),
  }))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/event-stream')
  expect(await response.text()).toBe(event)
  expect(stream).toHaveBeenCalledTimes(1)
})
