import { describe, it, expect } from 'bun:test'
import { parseJsonObject } from '@api/modules/ai/service'

describe('parseJsonObject', () => {
  it('parses a well-formed JSON array', () => {
    const result = parseJsonObject<{ title: string }[]>('[{"title":"Task 1"}]', /\[[\s\S]*\]/, 'task list')
    expect(result).toEqual([{ title: 'Task 1' }])
  })

  it('parses a well-formed JSON object', () => {
    const result = parseJsonObject<{ subject: string }>('{"subject":"Hello"}', /\{[\s\S]*\}/, 'outreach draft')
    expect(result).toEqual({ subject: 'Hello' })
  })

  it('extracts JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"headline":"Stable"}\n```'
    const result = parseJsonObject<{ headline: string }>(raw, /\{[\s\S]*\}/, 'finance narrative')
    expect(result).toEqual({ headline: 'Stable' })
  })

  it('throws labeled error when no JSON pattern is found', () => {
    expect(() => parseJsonObject('no json here', /\{[\s\S]*\}/, 'finance narrative')).toThrow(
      'No JSON in finance narrative',
    )
  })

  it('throws labeled error on malformed JSON', () => {
    expect(() => parseJsonObject('{"subject": }', /\{[\s\S]*\}/, 'outreach draft')).toThrow(
      'Invalid JSON in outreach draft',
    )
  })

  it('throws on an empty string', () => {
    expect(() => parseJsonObject('', /\{[\s\S]*\}/, 'finance narrative')).toThrow('No JSON in finance narrative')
  })
})
