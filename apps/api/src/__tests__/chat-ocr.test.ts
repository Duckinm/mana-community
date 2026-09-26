import { describe, expect, it } from 'bun:test'
import { parseOcrContent } from '@api/modules/chat/ocr'

describe('parseOcrContent', () => {
  it('unwraps the v1 JSON envelope', () => {
    expect(parseOcrContent('{"natural_text":"| ค่าบริการ | 1,500.00 |"}')).toBe('| ค่าบริการ | 1,500.00 |')
  })

  it('passes v1.5 markdown through untouched', () => {
    expect(parseOcrContent('# ใบเสร็จรับเงิน\n\nยอดรวม 1,500.00')).toBe('# ใบเสร็จรับเงิน\n\nยอดรวม 1,500.00')
  })

  it('keeps a JSON-looking transcription that is not an envelope', () => {
    expect(parseOcrContent('{ "total": 1500 }')).toBe('{ "total": 1500 }')
  })

  it('reports nothing for a blank page rather than an empty string', () => {
    expect(parseOcrContent('   ')).toBeNull()
    expect(parseOcrContent('{"natural_text":"  "}')).toBeNull()
  })
})
