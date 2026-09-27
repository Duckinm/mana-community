import { expect, it } from 'bun:test'

it('settles successful and failed turns before terminal events and reports save failures', () => {
  const result = Bun.spawnSync({
    cmd: [process.execPath, '--no-env-file', '-e', `
      import { mock } from 'bun:test'
      import { strict as assert } from 'node:assert'
      let selectIndex = 0
      mock.module('@api/db', () => ({ db: {
        select() {
          const rows = [
            [{ name: 'Test', plan: 'free', aiMemory: false }],
            [{ id: 'existing-message' }],
            [{ titleGeneratedAt: new Date() }],
          ][selectIndex++ % 3]
          return { from: () => ({ where: () => ({
            then: resolve => Promise.resolve(rows).then(resolve),
            limit: async () => rows,
          }) }) }
        },
      } }))
      mock.module('@api/modules/billing/usage', () => ({
        claimAiAction: async () => {},
        nextResetAt: () => new Date(),
      }))
      mock.module('@api/modules/chat/sessions', () => ({ verifySessionOwnership: async () => true }))
      mock.module('@api/utils/mcp-tools', () => ({ mcpToolDefinitions: [], executeToolCall: async () => ({}) }))
      mock.module('@api/modules/accounting/service', () => ({ getCashFlowForecast: async () => ({}) }))
      let release
      let started
      let settle
      let providerFails = false
      mock.module('@api/modules/chat/ai-action', () => ({
        settleAiAction: async () => { started(); await settle },
      }))
      mock.module('@api/modules/ai/client', () => ({
        assertAiConfigured() {},
        trackedCreate: async () => ({ content: [] }),
        trackedStream() {
          if (providerFails) throw new Error('provider response contains synthetic-secret')
          return {
            stream: (async function* () {
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
            })(),
            finalMessage: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello' }] }),
          }
        },
      }))
      const { buildChatStream } = await import('@api/modules/chat/service')
      for (const mode of ['success', 'provider-error', 'save-error']) {
        providerFails = mode === 'provider-error'
        let rejectSave
        settle = new Promise((resolve, reject) => { release = resolve; rejectSave = reject })
        const settling = new Promise(resolve => { started = resolve })
        const stream = await buildChatStream('test-user', 'test-session', 'Hello')
        const reader = stream.getReader()
        if (!providerFails) {
          const text = await reader.read()
          assert.match(new TextDecoder().decode(text.value), /text_delta/)
        }
        await settling
        const terminal = reader.read()
        const first = await Promise.race([
          terminal.then(() => 'terminal'),
          new Promise(resolve => setTimeout(() => resolve('pending'), 10)),
        ])
        assert.equal(first, 'pending', mode + ': terminal event arrived before persistence')
        if (mode === 'save-error') rejectSave(new Error('database response contains synthetic-secret'))
        else release()
        const event = JSON.parse(new TextDecoder().decode((await terminal).value).slice(6))
        assert.equal(event.type, mode === 'success' ? 'done' : 'error')
        assert.ok(!JSON.stringify(event).includes('synthetic-secret'))
        assert.equal((await reader.read()).done, true)
      }
    `],
    cwd: new URL('../..', import.meta.url).pathname,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:1/mana_test',
      BETTER_AUTH_SECRET: 'test-only-key',
      BETTER_AUTH_URL: 'http://localhost:4000',
      R2_ENDPOINT: 'http://127.0.0.1:1',
      R2_ACCESS_KEY_ID: 'test',
      R2_SECRET_ACCESS_KEY: 'test',
      R2_PUBLIC_URL: 'http://127.0.0.1:1',
    },
  })
  expect(result.stderr.toString()).toBe('')
  expect(result.exitCode).toBe(0)
})
