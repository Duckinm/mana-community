import { describe, expect, it } from 'bun:test'
import { extractCandidateCodes, generateLinkCode } from '@api/lib/line/link-code'

describe('LINE link code', () => {
  it('pulls the code out of a message the user typed around', () => {
    expect(extractCandidateCodes('code: a2b4c6')).toEqual(['A2B4C6'])
    expect(extractCandidateCodes('MANA A2B4C6')).toEqual(['A2B4C6'])
    expect(extractCandidateCodes('hello')).toEqual([])
  })

  it('generates codes without look-alike characters', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateLinkCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    }
  })
})
