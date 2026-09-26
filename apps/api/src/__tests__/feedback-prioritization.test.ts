import { describe, expect, it } from 'bun:test'
import { planFeedbackPrioritization } from '@api/modules/feedback/prioritize'

const compound = {
  id: 'feedback-1',
  type: 'bug',
  message: 'Invoices fail to send and the dashboard needs a dark theme.',
  parentFeedbackId: null,
  splitState: null,
} as const

const part = (message: string) => ({
  message,
  type: 'bug',
  severity: 'warning',
  note: 'actionable',
  score: 3,
  encounters: 0,
  summary: 'Fix it',
  estimate: '2 hours',
})

describe('planFeedbackPrioritization', () => {
  it('splits an unreviewed compound submission into distinct atomic parts', () => {
    const [plan] = planFeedbackPrioritization([compound], [
      {
        id: compound.id,
        parts: [
          part('Fix invoice delivery failures.'),
          { ...part('Add dashboard dark theme.'), type: 'idea' },
        ],
      },
    ])

    expect(plan.split).toBe(true)
    expect(plan.parts.map(({ message }) => message)).toEqual([
      'Fix invoice delivery failures.',
      'Add dashboard dark theme.',
    ])
    expect(plan.parts.map(({ type }) => type)).toEqual(['bug', 'idea'])
  })

  it('never re-splits an atomic entry on a later prioritization run', () => {
    const atomic = { ...compound, splitState: 'atomic' as const }
    const [plan] = planFeedbackPrioritization([atomic], [
      {
        id: atomic.id,
        parts: [part('First interpretation.'), part('Second interpretation.')],
      },
    ])

    expect(plan.split).toBe(false)
    expect(plan.parts).toHaveLength(1)
    expect(plan.parts[0]?.message).toBe(atomic.message)
  })

  it('supports submissions containing more than 100 stories', () => {
    const stories = Array.from({ length: 101 }, (_, index) => part(`Story ${index + 1}`))
    const [plan] = planFeedbackPrioritization([compound], [{ id: compound.id, parts: stories }])

    expect(plan.split).toBe(true)
    expect(plan.parts).toHaveLength(101)
  })

  it('deduplicates repeated parts and normalizes invalid classification fields', () => {
    const [plan] = planFeedbackPrioritization([compound], [
      {
        id: compound.id,
        parts: [
          {
            ...part('Fix invoice delivery failures.'),
            type: 'invalid',
            score: 4,
            encounters: -1,
          },
          part('Fix invoice delivery failures.'),
        ],
      },
    ])

    expect(plan.split).toBe(false)
    expect(plan.parts).toHaveLength(1)
    expect(plan.parts[0]?.score).toBeNull()
    expect(plan.parts[0]?.encounterCount).toBeNull()
    expect(plan.parts[0]?.type).toBe(compound.type)
  })
})
