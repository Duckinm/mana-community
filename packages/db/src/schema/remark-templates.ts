import { sql } from 'drizzle-orm'
import { pgTable, text, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

export const remarkTemplates = pgTable('remark_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  body: text('body').notNull().default(''),
  defaultFor: text('default_for').array().notNull().default(sql`ARRAY[]::text[]`),
  position: integer('position').notNull().default(0),
  ...timestamps,
})
