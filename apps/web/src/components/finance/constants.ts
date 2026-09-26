import type { PaymentMethod, Wallet } from '@/components/finance/types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  card: 'Card',
  promptpay: 'PromptPay',
  cash: 'Cash',
  crypto: 'Crypto',
  other: 'Other',
}

// ponytail: color follows method so cards stay visually consistent; add a method, add a color here
export const PAYMENT_METHOD_COLORS: Record<PaymentMethod, string> = {
  bank_transfer: 'var(--primary)',
  card: 'var(--category-purple)',
  promptpay: 'var(--category-orange)',
  cash: 'var(--category-green)',
  crypto: 'var(--warning)',
  other: 'var(--muted-foreground)',
}

export const STATUS_COLOR: Record<string, string> = {
  received: 'var(--muted-foreground)',
  paid: 'var(--muted-foreground)',
  pending: 'var(--warning)',
  overdue: 'var(--warning)',
}

export const STATUS_COLOR_SOFT: Record<string, string> = {
  received: 'var(--surface-raised)',
  paid: 'var(--surface-raised)',
  pending: 'var(--warning-soft)',
  overdue: 'var(--warning-soft)',
}

// ponytail: last 4 is derived rather than entered by hand, single source of truth wins over duplicate data entry
export function walletLastFour(wallet: Pick<Wallet, 'type' | 'accountNumber' | 'cardNumber' | 'promptPayId'>): string | null {
  const source =
    wallet.type === 'card' ? wallet.cardNumber :
    wallet.type === 'promptpay' ? wallet.promptPayId :
    wallet.accountNumber
  const digits = source?.replace(/\D/g, '') ?? ''
  return digits.length >= 4 ? digits.slice(-4) : null
}

export function walletLabel(wallet: Pick<Wallet, 'type' | 'bankName' | 'cardholderName'>): string {
  const type = wallet.type as PaymentMethod
  if (type === 'bank_transfer' && wallet.bankName) return wallet.bankName
  if (type === 'card' && wallet.cardholderName) return wallet.cardholderName
  return PAYMENT_METHOD_LABELS[type]
}
