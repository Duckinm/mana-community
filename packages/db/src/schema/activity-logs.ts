import { pgTable, text, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { instant } from './timestamp'

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  contactId: text('contact_id'),
  projectId: text('project_id'),
  action: text('action').notNull(),
  summaryKey: text('summary_key').notNull(),
  summaryParams: text('summary_params'),
  metadata: text('metadata'),
  createdAt: instant('created_at').defaultNow().notNull(),
}, (t) => [
  index('activity_user_created_idx').on(t.userId, t.createdAt),
  index('activity_contact_idx').on(t.contactId, t.createdAt),
  index('activity_project_idx').on(t.projectId, t.createdAt),
  index('activity_entity_idx').on(t.entityType, t.entityId),
])
