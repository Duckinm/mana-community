import type { ApiTransaction, ApiWallet } from '@/lib/api-types'

export type Transaction = ApiTransaction

export type TransactionType = ApiTransaction['type']
export type TransactionStatus = ApiTransaction['status']
export type Wallet = Omit<ApiWallet, 'userId' | 'createdAt' | 'updatedAt'>
export type PaymentMethod = 'bank_transfer' | 'card' | 'promptpay' | 'cash' | 'crypto' | 'other'
