import { pgTable, text, boolean, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant, timestamps } from './timestamp'

export const chatSessions = pgTable('chat_sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New Chat'),
  titleGeneratedAt: instant('title_generated_at'),
  pinned: boolean('pinned').notNull().default(false),
  ...timestamps,
}, (t) => [
  index('chat_sessions_user_id_idx').on(t.userId),
  index('chat_sessions_updated_at_idx').on(t.updatedAt),
])
