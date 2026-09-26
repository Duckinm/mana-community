import { describe, expect, it } from 'vitest'
import { serializePainPoints } from '@/components/onboarding/draft'

describe('serializePainPoints', () => {
  it('stores a trimmed custom answer in place of other', () => {
    expect(serializePainPoints({
      painPoints: ['projects', 'other'],
      painPointOther: '  managing retainers  ',
    })).toBe('projects,managing retainers')
  })

  it('drops an empty custom answer', () => {
    expect(serializePainPoints({ painPoints: ['other'], painPointOther: '  ' })).toBeNull()
  })
})
