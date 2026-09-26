import { describe, expect, it } from 'bun:test'
import { parseReceiptDraft } from '@api/modules/ai/service'

describe('parseReceiptDraft', () => {
  it('reads a fenced draft off a Thai receipt', () => {
    const draft = parseReceiptDraft(
      '```json\n{"type":"expense","amount":561.75,"description":"ร้านกาแฟ สยาม","category":"Food","date":"2026-07-28","currency":"THB","flags":[]}\n```',
    )
    expect(draft.amount).toBe(561.75)
    expect(draft.currency).toBe('THB')
  })

  // C-447: the model burned its whole token budget thinking and returned no text block,
  // which used to parse "{}" and surface Zod's raw issue list in the user's toast.
  it('reports a readable error when the model returned no text', () => {
    expect(() => parseReceiptDraft(undefined)).toThrow(/Add the transaction manually/)
    expect(() => parseReceiptDraft('   ')).toThrow(/Add the transaction manually/)
  })

  it('reports a readable error when amount and description are missing', () => {
    expect(() => parseReceiptDraft('{}')).toThrow(/amount and description/)
    expect(() => parseReceiptDraft('{}')).not.toThrow(/invalid_type/)
  })
})
