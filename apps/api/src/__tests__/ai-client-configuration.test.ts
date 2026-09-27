import { afterEach, expect, it, mock, spyOn } from 'bun:test'
import { db } from '@api/db'
import { buildChatStream } from '@api/modules/chat/service'
import { env } from '@api/env'
import { trackedCreate, trackedStream } from '@api/modules/ai/client'

const originalKey = env.ANTHROPIC_API_KEY

afterEach(() => {
  env.ANTHROPIC_API_KEY = originalKey
  mock.restore()
})

it('imports without an AI key and rejects both AI request paths without network access', async () => {
  env.ANTHROPIC_API_KEY = undefined
  const network = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'))
  const params = { model: 'unconfigured', max_tokens: 32, messages: [{ role: 'user' as const, content: 'Hello' }] }
  await expect(trackedCreate('test-user', params)).rejects.toThrow('AI is not configured')
  expect(() => trackedStream('test-user', params)).toThrow('AI is not configured')
  expect(network).not.toHaveBeenCalled()
})

it('rejects unconfigured chat before database access, usage claims, or provider calls', async () => {
  env.ANTHROPIC_API_KEY = undefined
  const database = spyOn(db, 'select').mockImplementation(() => { throw new Error('Unexpected database access') })
  const writes = spyOn(db, 'insert').mockImplementation(() => { throw new Error('Unexpected database write') })
  const network = spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected network request'))
  await expect(buildChatStream('test-user', 'test-session', 'Hello')).rejects.toThrow('AI is not configured')
  expect(database).not.toHaveBeenCalled()
  expect(writes).not.toHaveBeenCalled()
  expect(network).not.toHaveBeenCalled()
})
