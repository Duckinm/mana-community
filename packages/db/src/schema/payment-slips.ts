import { pgTable, text, integer, boolean, jsonb } from 'drizzle-orm/pg-core'
import { documents } from './documents'
import { storageFiles } from './storage'
import { transactions } from './transactions'
import { instant, timestamps } from './timestamp'

// Payment slips — PromptPay slip uploads (guest or owner) proposed against a
// document for reconciliation. Never auto-reconciled; owner must confirm.
export const paymentSlips = pgTable('payment_slips', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  fileId: text('file_id').notNull().references(() => storageFiles.id),
  source: text('source').notNull(), // 'guest' | 'owner'
  status: text('status').notNull().default('proposed'), // 'proposed' | 'mismatched' | 'confirmed' | 'dismissed' | 'failed'
  extractedAmountCents: integer('extracted_amount_cents'),
  extractedCurrency: text('extracted_currency'),
  extractedDate: text('extracted_date'), // 'YYYY-MM-DD'
  extractedRef: text('extracted_ref'),
  aiUncertain: boolean('ai_uncertain').notNull().default(false),
  mismatchWarning: text('mismatch_warning'),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
  // Tier 1 (free): was a PromptPay QR found in the slip image, and has it been seen before?
  qrChecked: boolean('qr_checked').notNull().default(false),
  qrFound: boolean('qr_found').notNull().default(false),
  qrRawText: text('qr_raw_text'),
  qrWarning: text('qr_warning'),
  // Tier 2 (paid, owner-triggered): real bank-side cross-check via Thunder Solution.
  apiVerified: boolean('api_verified').notNull().default(false),
  apiVerificationProvider: text('api_verification_provider'),
  apiVerifiedAt: instant('api_verified_at'),
  apiVerificationRaw: jsonb('api_verification_raw'),
  // Thunder's own bank transaction reference — unique across all slips so the same bank
  // transfer can never be verified as payment for two different slips/documents.
  transRef: text('trans_ref').unique(),
  ...timestamps,
})
