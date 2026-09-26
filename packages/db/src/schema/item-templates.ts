import { pgTable, text, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { timestamps } from './timestamp'

export const itemTemplates = pgTable('item_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  defaultQty: integer('default_qty').notNull().default(100),
  defaultUnitPriceCents: integer('default_unit_price_cents').notNull().default(0),
  currency: text('currency').notNull().default('THB'),
  position: integer('position').notNull().default(0),
  imageR2Key: text('image_r2_key'),
  imageWidth: integer('image_width'),
  imageHeight: integer('image_height'),
  imageBlurDataUrl: text('image_blur_data_url'),
  ...timestamps,
})
