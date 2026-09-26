import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  key: text('key'),
  params: jsonb('params').$type<Record<string, string | number>>(),
  link: text('link'),
  readAt: instant('read_at'),
  ...timestamps,
})
