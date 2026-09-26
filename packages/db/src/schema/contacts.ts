import { pgTable, text, integer, jsonb } from 'drizzle-orm/pg-core'
import type { TiptapDoc } from '../lib/rich-text'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  initials: text('initials').notNull().default(''),
  role: text('role').default(''),
  company: text('company').default(''),
  email: text('email').default(''),
  website: text('website').default(''),
  color: text('color').default('#D4A843'),
  tags: text('tags').default('[]'), // JSON string[]
  relationshipLevel: integer('relationship_level').notNull().default(1), // 1–5
  metVia: text('met_via').default('Direct'),
  phone: text('phone'),
  // Tiptap document; null = empty
  notes: jsonb('notes').$type<TiptapDoc>(),
  imageUrl: text('image_url'),
  stage: text('stage').default('lead'), // lead|prospect|client|recurring|churned
  dealValue: text('deal_value'),
  dealStatus: text('deal_status').default('none'), // none|open|won|lost
  lastContactedAt: instant('last_contacted_at'),
  entityType: text('entity_type').notNull().default('individual'),
  nameTh: text('name_th'),
  addressTh: text('address_th'),
  taxId: text('tax_id'),
  branchNumber: text('branch_number'),
  zip: text('zip'),
  country: text('country'),
  address: text('address'),
  nationalId: text('national_id'),
  companyNameEn: text('company_name_en'),
  companyNameTh: text('company_name_th'),
  companyAddress: text('company_address'),
  companyAddressTh: text('company_address_th'),
  companyZip: text('company_zip'),
  companyCountry: text('company_country'),
  briefingData: text('briefing_data'), // JSON cache of last computed AI briefing
  briefingCheckedAt: instant('briefing_checked_at'),
  ...timestamps,
})
