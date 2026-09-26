import { useSyncExternalStore } from 'react'

export interface Currency {
  code: string
  symbol: string
  name: string
  locale: string
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', locale: 'th-TH' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
]

const DEFAULT_CURRENCY = CURRENCIES[0]

/** Resolve a Currency object by code, falling back to the provided default. */
export function resolveCurrency(code: string | undefined, fallback: Currency): Currency {
  if (!code) return fallback
  return CURRENCIES.find((c) => c.code === code) ?? fallback
}

type Listener = () => void
const listeners = new Set<Listener>()

let serverSnapshot: Currency = DEFAULT_CURRENCY

function readStoredCode(): string | null {
  try {
    return localStorage.getItem('currency')
  } catch {
    return null
  }
}

function getSnapshot(): Currency {
  const saved = readStoredCode()
  return CURRENCIES.find((c) => c.code === saved) ?? serverSnapshot
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function setCurrencyCode(code: string) {
  const found = CURRENCIES.find((c) => c.code === code)
  if (!found) return
  serverSnapshot = found
  try {
    localStorage.setItem('currency', code)
  } catch { /* ignore */ }
  listeners.forEach((l) => l())
}

/** Sync display currency from the user's DB preference (e.g. on settings load). */
export function syncCurrencyFromUser(code: string | null | undefined) {
  if (!code) return
  const found = CURRENCIES.find((c) => c.code === code)
  if (!found) return
  if (readStoredCode() === code && serverSnapshot.code === code) return
  setCurrencyCode(code)
}

export function useCurrency() {
  const currency = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)

  return { currency, setCurrency: setCurrencyCode }
}
