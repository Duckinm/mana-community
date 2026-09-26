import { pgTable, text, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { deletedAt, instant, timestamps } from './timestamp'

// Storage folders — hierarchical folder tree per user (root folders have null parentId)
export const storageFolders = pgTable('storage_folders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  color: text('color'),
  ...timestamps,
})

// Storage files — metadata for files uploaded to Cloudflare R2
export const storageFiles = pgTable('storage_files', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('other'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  mimeType: text('mime_type').notNull().default('application/octet-stream'),
  folderId: text('folder_id'),
  r2Key: text('r2_key').notNull(),
  tags: text('tags'),
  uploadedAt: instant('uploaded_at').notNull().defaultNow(),
  updatedAt: instant('updated_at').notNull().defaultNow(),
  deletedAt,
})

// File links — many-to-many between files and entities (contact, project, transaction)
export const fileLinks = pgTable('file_links', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileId: text('file_id').notNull().references(() => storageFiles.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
})
