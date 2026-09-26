import { pgTable, text, integer, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { itemTemplates } from './item-templates'
import { timestamps } from './timestamp'

export const itemTemplateGroups = pgTable('item_template_groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  color: text('color').notNull().default('amber'),
  icon: text('icon'),
  position: integer('position').notNull().default(0),
  ...timestamps,
})

export const itemTemplateGroupMembers = pgTable('item_template_group_members', {
  groupId: text('group_id').notNull().references(() => itemTemplateGroups.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull().references(() => itemTemplates.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.groupId, t.templateId] })])
