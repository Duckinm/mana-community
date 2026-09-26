import { describe, expect, it } from 'vitest'
import { isValidThaiPhoneNumbers, phoneHref, splitPhoneNumbers } from '@/lib/phone-numbers'

describe('phone number helpers', () => {
  it('accepts comma-separated Thai phone numbers', () => {
    expect(isValidThaiPhoneNumbers('081-234-5678, +66 2 123 4567')).toBe(true)
    expect(isValidThaiPhoneNumbers('081-234-5678, not-a-phone')).toBe(false)
    expect(isValidThaiPhoneNumbers('081-234-5678,')).toBe(false)
  })

  it('keeps each display value while creating usable links', () => {
    const phones = splitPhoneNumbers('081-234-5678, +66 2 123 4567')

    expect(phones).toEqual(['081-234-5678', '+66 2 123 4567'])
    expect(phones.map(phoneHref)).toEqual(['tel:0812345678', 'tel:+6621234567'])
  })
})
