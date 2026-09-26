import { pgTable, text, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { chatSessions } from './chat-sessions'
import { instant } from './timestamp'

// Chat messages — persisted AI conversation history per user
export const chatMessages = pgTable('chat_messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'),
  toolResults: text('tool_results'),
  createdAt: instant('created_at').notNull().defaultNow(),
}, (t) => [
  index('chat_messages_user_id_idx').on(t.userId),
  index('chat_messages_created_at_idx').on(t.createdAt),
  index('chat_messages_session_id_idx').on(t.sessionId),
])
