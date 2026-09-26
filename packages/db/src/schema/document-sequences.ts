import { pgTable, text, integer, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'

export const documentSequences = pgTable('document_sequences', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  year: integer('year').notNull(),
  seq: integer('seq').notNull().default(0),
}, (t) => [
  uniqueIndex('document_sequences_user_type_year_idx').on(t.userId, t.type, t.year),
])
