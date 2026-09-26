import { describe, expect, it } from 'vitest'
import { promptPayPayload } from '@/lib/promptpay'

describe('promptPayPayload', () => {
  it('encodes a phone number target with the amount due', () => {
    const payload = promptPayPayload('0899999999', 42200)

    expect(payload.startsWith('000201')).toBe(true)
    expect(payload).toContain('5303764')
    expect(payload).toContain('5802TH')
    expect(payload).toContain('5406422.00')
    expect(payload).toContain('66899999999')
  })

  it('encodes a 13-digit national ID target verbatim', () => {
    const payload = promptPayPayload('1234567890123', 42200)

    expect(payload.startsWith('000201')).toBe(true)
    expect(payload).toContain('1234567890123')
  })
})
