import { pgTable, text, boolean, integer, jsonb, numeric } from 'drizzle-orm/pg-core'
import type { TiptapDoc } from '../lib/rich-text'
import { users } from './users'
import { projects } from './projects'
import { milestones } from './milestones'
import { instant, timestamps } from './timestamp'

// Tasks table — tasks belonging to a project
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // Sequential number within the project — combined with the project prefix for display (e.g. "ACM-12")
  number: integer('number').notNull().default(0),
  title: text('title').notNull(),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('med'),
  due: text('due'),
  dueTime: text('due_time'),
  scheduledStart: instant('scheduled_start'),
  scheduledEnd: instant('scheduled_end'),
  // JSON-serialised string[] of label ids (see `labels` table)
  labelIds: text('label_ids').default('[]'),
  aiAssigned: boolean('ai_assigned').default(false),
  description: text('description'),
  // Tiptap document; null = empty
  body: jsonb('body').$type<TiptapDoc>(),
  // Sort order within the status column — lower = higher in the list
  position: integer('position').notNull().default(0),
  milestoneId: text('milestone_id').references(() => milestones.id, { onDelete: 'set null' }),
  estimatedHours: numeric('estimated_hours', { precision: 6, scale: 2 }),
  ...timestamps,
})
