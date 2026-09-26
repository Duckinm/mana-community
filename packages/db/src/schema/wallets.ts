import { pgTable, text, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Wallets table — the freelancer's own bank accounts/cards/platform balances.
// Doubles as the source for invoice payment details (showOnInvoice) so a bank
// account only needs to be entered once.
export const wallets = pgTable('wallets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('bank_transfer'), // bank_transfer | card | promptpay | cash | crypto | other
  lastFour: text('last_four'),
  color: text('color').notNull().default('#5b8def'),
  isDefault: boolean('is_default').default(false).notNull(),
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountName: text('account_name'),
  swiftCode: text('swift_code'),
  promptPayId: text('prompt_pay_id'),
  cardNumber: text('card_number'),
  cardExpiry: text('card_expiry'),
  cardholderName: text('cardholder_name'),
  showOnInvoice: boolean('show_on_invoice').default(false).notNull(),
  isDefaultInvoice: boolean('is_default_invoice').default(false).notNull(),
  ...timestamps,
})
