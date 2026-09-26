import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { projects } from './projects'
import { senderProfiles } from './sender-profiles'
import { deletedAt, instant, timestamps } from './timestamp'

export const documents = pgTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  status: text('status').notNull().default('draft'),
  number: text('number').notNull(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  contactId: text('contact_id'),
  currency: text('currency').notNull().default('THB'),
  documentLanguage: text('document_language').notNull().default('th'),

  // Amounts
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  discountCents: integer('discount_cents').notNull().default(0),
  taxRateBps: integer('tax_rate_bps').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  whtRateBps: integer('wht_rate_bps').notNull().default(0),
  whtCents: integer('wht_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  amountDueCents: integer('amount_due_cents').notNull().default(0),

  issueDate: text('issue_date'),
  dueDate: text('due_date'),
  validUntilDate: text('valid_until_date'),
  paymentTermsText: text('payment_terms_text'),
  sentAt: instant('sent_at'),
  clientStatus: text('client_status'),
  clientApprovedAt: instant('client_approved_at'),
  clientApprovalIp: text('client_approval_ip'),
  paidAt: text('paid_at'),
  whtCertNumber: text('wht_cert_number'),

  // Your details
  // Which sender profile issued this document. Fields below are copies (the document
  // must survive profile edits), but e-Tax needs to know which profile opted in.
  senderProfileId: text('sender_profile_id').references(() => senderProfiles.id, { onDelete: 'set null' }),
  vatRegistered: boolean('vat_registered').notNull().default(false),
  registeredName: text('registered_name'),
  registeredNameEn: text('registered_name_en'),
  yourEmail: text('your_email'),
  yourPhone: text('your_phone'),
  registeredAddress: text('registered_address'),
  registeredAddressEn: text('registered_address_en'),
  yourCountry: text('your_country'),
  yourZip: text('your_zip'),
  yourTaxId: text('your_tax_id'),
  yourBranchNumber: text('your_branch_number'),
  yourLogo: text('your_logo'),
  signatureImage: text('signature_image'),
  signatureEnabled: boolean('signature_enabled').notNull().default(false),
  signaturePlacement: text('signature_placement'),

  // Client details
  clientName: text('client_name'),
  clientNameTh: text('client_name_th'),
  clientEmail: text('client_email'),
  clientPhone: text('client_phone'),
  clientAddress: text('client_address'),
  clientAddressTh: text('client_address_th'),
  clientCountry: text('client_country'),
  clientZip: text('client_zip'),
  clientTaxId: text('client_tax_id'),
  clientBranchNumber: text('client_branch_number'),

  // Payment
  bankName: text('bank_name'),
  accountNumber: text('account_number'),
  accountName: text('account_name'),
  swiftCode: text('swift_code'),
  promptPayId: text('prompt_pay_id'),
  cardNumber: text('card_number'),
  cardExpiry: text('card_expiry'),
  cardholderName: text('cardholder_name'),

  remark: text('remark'),
  pdfR2Key: text('pdf_r2_key'),
  pdfFailedAt: instant('pdf_failed_at'),
  publicToken: text('public_token').$defaultFn(() => crypto.randomUUID()),
  publicAccessRevokedAt: instant('public_access_revoked_at'),
  publicAccessRotatedAt: instant('public_access_rotated_at'),
  viewedAt: instant('viewed_at'),
  parentDocumentId: text('parent_document_id'),
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurringInterval: text('recurring_interval'),
  nextGenerationDate: text('next_generation_date'),
  ...timestamps,
  deletedAt,
})

export const documentItems = pgTable('document_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  description: text('description').notNull().default(''),
  quantity: integer('quantity').notNull().default(100),
  unitPriceCents: integer('unit_price_cents').notNull().default(0),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  position: integer('position').notNull().default(0),
})

export const documentVersions = pgTable('document_versions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  snapshotJson: text('snapshot_json').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
})
