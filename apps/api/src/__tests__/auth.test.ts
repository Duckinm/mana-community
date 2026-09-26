import { describe, expect, it } from 'bun:test'
import { auth } from '@api/auth'

// NOTE: These are scaffolded unit tests.
// Full integration tests live in tests/api/ (Bruno collections).
// Run integration tests with: bun run test:integration

describe('Auth endpoints', () => {
  it('allows verified OAuth providers to link to an existing email account', () => {
    expect('disableImplicitLinking' in (auth.options.account?.accountLinking ?? {})).toBe(false)
  })

  it.todo('POST /api/auth/sign-up/email — creates a new user', () => {})
  it.todo('POST /api/auth/sign-in/email — returns session token', () => {})
  it.todo('POST /api/auth/sign-out — clears session', () => {})
  it.todo('GET /api/auth/get-session — returns null when not authenticated', () => {})
})
