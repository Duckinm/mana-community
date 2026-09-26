import { CURRENCIES } from '@/components/documents/ui/currency-combobox'

export function currencySymbol(currency: string): string {
  return CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency
}

export function formatDocumentAmount(cents: number, currency: string): string {
  const symbol = currencySymbol(currency)
  return `${symbol}${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)}`
}

export function formatDocumentAmountRaw(value: number, currency: string): string {
  const symbol = currencySymbol(currency)
  return `${symbol}${value.toFixed(2)}`
}
