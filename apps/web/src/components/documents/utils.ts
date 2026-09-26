import { CURRENCIES } from '@/hooks/use-currency'

export function formatCurrency(cents: number, currency = 'THB'): string {
  // Formatting THB under en-US prints "THB 1.00" instead of "฿1.00" — use the
  // currency's own locale so the app shows one notation everywhere.
  const locale = CURRENCIES.find((c) => c.code === currency)?.locale ?? 'en-US'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}
