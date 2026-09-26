import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'
import type { TiptapDoc } from '../lib/rich-text'
import { users } from './users'
import { projects } from './projects'
import { timestamps } from './timestamp'

// Milestones table — checkpoints within a project; tasks may optionally link to one
export const milestones = pgTable('milestones', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  dueDate: text('due_date').default(''),
  // Tiptap document; null = empty
  description: jsonb('description').$type<TiptapDoc>(),
  status: text('status').notNull().default('pending'),
  ...timestamps,
})
