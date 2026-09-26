import { describe, expect, it } from 'vitest'
import { CURRENCIES, localizedCurrencyName } from '@/components/documents/ui/currency-combobox'

describe('localizedCurrencyName', () => {
  it('localizes currency names without changing their codes', () => {
    const thb = CURRENCIES.find((currency) => currency.value === 'THB')!

    expect(localizedCurrencyName(thb, 'th')).toContain('บาท')
    expect(localizedCurrencyName(thb, 'en')).toContain('Baht')
  })
})
