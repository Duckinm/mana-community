import { describe, expect, it } from 'bun:test'
import { buildProjectLimitToolError } from '@api/modules/billing/entitlements'

describe('buildProjectLimitToolError', () => {
  it('returns exact used/cap for Free plan', () => {
    expect(buildProjectLimitToolError('free', 1, 1)).toEqual({
      error: 'PLAN_LIMIT_PROJECTS',
      message: expect.stringContaining('1/1'),
      plan: 'free',
      used: 1,
      cap: 1,
    })
  })

  it('mentions Mana and Aether upgrade paths', () => {
    const result = buildProjectLimitToolError('mana', 10, 10)
    expect(result.message).toContain('10/10')
    expect(result.message).toContain('Mana allows 10')
    expect(result.message).toContain('Aether is unlimited')
  })
})
