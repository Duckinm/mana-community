import { pgTable, text } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

// Global labels — reusable across all of a user's projects (not project-scoped)
export const labels = pgTable('labels', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull().default('#D4A843'),
  ...timestamps,
})
