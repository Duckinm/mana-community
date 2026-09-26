import { pgTable, text, integer, boolean } from 'drizzle-orm/pg-core'
import { timestamps } from './timestamp'

export type CmsLocale = 'th' | 'en'

export const cmsKeywords = pgTable('cms_keywords', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  term: text('term').notNull(),
  locale: text('locale').$type<CmsLocale>().notNull().default('th'),
  priority: integer('priority').notNull().default(0),
  ...timestamps,
})

export const cmsCompetitors = pgTable('cms_competitors', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  url: text('url').notNull(),
  notes: text('notes').notNull().default(''),
  ...timestamps,
})

// Single row keyed `default` — read-or-create on access.
export const cmsSettings = pgTable('cms_settings', {
  id: text('id').primaryKey().default('default'),
  autoPublish: boolean('auto_publish').notNull().default(true),
  ...timestamps,
})
