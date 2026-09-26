import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

export const senderProfiles = pgTable('sender_profiles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  entityType: text('entity_type').notNull().default('individual'),
  // Invoice term. QO/RC are nullable because null means "no due date at all",
  // which is the sane default for a quotation validity and for a receipt.
  defaultDueDaysOffset: integer('default_due_days_offset').notNull().default(30),
  defaultDueDaysQo: integer('default_due_days_qo'),
  defaultDueDaysRc: integer('default_due_days_rc'),
  defaultTaxRateBps: integer('default_tax_rate_bps').notNull().default(700),
  registeredName: text('registered_name'),
  registeredNameEn: text('registered_name_en'),
  yourEmail: text('your_email'),
  yourPhone: text('your_phone'),
  yourAddress: text('your_address'),
  yourAddressEn: text('your_address_en'),
  yourAddressZip: text('your_address_zip'),
  yourAddressCountry: text('your_address_country'),
  useSameAddressForCompany: boolean('use_same_address_for_company').notNull().default(true),
  registeredAddress: text('registered_address'),
  registeredAddressEn: text('registered_address_en'),
  yourCountry: text('your_country'),
  yourZip: text('your_zip'),
  yourTaxId: text('your_tax_id'),
  yourBranchNumber: text('your_branch_number'),
  yourLogo: text('your_logo'),
  signatureImage: text('signature_image'),
  signaturePlacement: text('signature_placement'),
  vatRegistered: boolean('vat_registered').notNull().default(false),
  documentLanguage: text('document_language').notNull().default('th'),
  defaultRemark: text('default_remark'),
  // Whether this profile may send e-Tax Invoice by Email (ETDA time-stamp scheme).
  // Requires the derived etax-{userId} sending address to be registered with the Revenue Dept first.
  etaxEnabled: boolean('etax_enabled').notNull().default(false),
  ...timestamps,
})
