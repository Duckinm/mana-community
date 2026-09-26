import { afterAll, afterEach, describe, expect, it, mock } from 'bun:test'
import { env as realEnv } from '@api/env'

type ProviderResponse = {
  data: { data: { id: string }[] } | null
  error: { message: string } | null
}

// Spread the real env under the overrides: bun's mock.module is process-global and
// permanent, so a partial stub would poison every module resolved after this file
// (missing AI_MODEL broke /health's response schema suite-wide — see GH #9).
const env = {
  ...realEnv,
  NODE_ENV: 'development',
  RESEND_API_KEY: 'test-api-key',
  RESEND_FROM_EMAIL: 'sender@example.com',
  EMAIL_SANDBOX_WHITELIST: '',
}

const batchSend = mock(async (_emails: unknown[]): Promise<ProviderResponse> => ({
  data: { data: [{ id: 'email-1' }] },
  error: null,
}))

mock.module('../env', () => ({ env }))
afterAll(() => {
  mock.module('../env', () => ({ env: realEnv }))
})
mock.module('resend', () => ({
  Resend: class {
    batch = { send: batchSend }
  },
}))

async function loadEmailModule(nodeEnv: string, whitelist: string): Promise<typeof import('@api/utils/email')> {
  env.NODE_ENV = nodeEnv
  env.EMAIL_SANDBOX_WHITELIST = whitelist
  return import(`../utils/email/index.ts?regression=${crypto.randomUUID()}`)
}

afterEach(() => {
  // loadEmailModule mutates these on the shared stub — reset so the mutation can't
  // leak into files loaded later in the run (GH #9: cors-origins saw NODE_ENV=production).
  env.NODE_ENV = 'development'
  env.EMAIL_SANDBOX_WHITELIST = ''
  batchSend.mockReset()
  batchSend.mockImplementation(async () => ({
    data: { data: [{ id: 'email-1' }] },
    error: null,
  }))
})

describe('sendEmailBatch delivery regressions', () => {
  it('preserves input-result correlation when a sandbox batch mixes allowed and blocked recipients', async () => {
    const { sendEmailBatch } = await loadEmailModule('development', 'allowed@example.com')

    const results = await sendEmailBatch([
      { to: 'blocked-first@example.com', subject: 'First', html: '<p>First</p>' },
      { to: 'allowed@example.com', subject: 'Second', html: '<p>Second</p>' },
      { to: 'blocked-last@example.com', subject: 'Third', html: '<p>Third</p>' },
    ])

    expect(results).toEqual([
      { to: 'blocked-first@example.com', status: 'blocked' },
      { to: 'allowed@example.com', status: 'sent', resendId: 'email-1' },
      { to: 'blocked-last@example.com', status: 'blocked' },
    ])
  })

  it('does not apply the sandbox whitelist in production', async () => {
    const { sendEmailBatch } = await loadEmailModule('production', 'sandbox-only@example.com')

    const results = await sendEmailBatch([
      { to: 'customer@example.com', subject: 'Production', html: '<p>Production</p>' },
    ])

    expect(results).toEqual([
      { to: 'customer@example.com', status: 'sent', resendId: 'email-1' },
    ])
    expect(batchSend).toHaveBeenCalledTimes(1)
  })

  it('returns failed outcomes when Resend rejects a batch', async () => {
    batchSend.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'Provider unavailable' },
    }))
    const { sendEmailBatch } = await loadEmailModule('development', 'allowed@example.com')

    await expect(sendEmailBatch([
      { to: 'allowed@example.com', subject: 'Failure', html: '<p>Failure</p>' },
    ])).resolves.toEqual([
      { to: 'allowed@example.com', status: 'failed', error: 'Provider unavailable' },
    ])
  })

  it('chunks provider batches at the Resend limit', async () => {
    batchSend.mockImplementation(async (emails: unknown[]) => ({
      data: { data: emails.map((_, index) => ({ id: `email-${index}` })) },
      error: null,
    }))
    const addresses = Array.from({ length: 101 }, (_, index) => `person-${index}@example.com`)
    const { sendEmailBatch } = await loadEmailModule('production', '')

    const results = await sendEmailBatch(addresses.map((to) => ({ to, subject: 'Chunked', html: '<p>Chunked</p>' })))

    expect(batchSend).toHaveBeenCalledTimes(2)
    expect(results).toHaveLength(101)
    expect(results.every((result) => result.status === 'sent')).toBe(true)
  })
})
