import { sql } from 'drizzle-orm'
import { pgTable, text, integer, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { cmsKeywords, type CmsLocale } from './cms'
import { deletedAt, instant, timestamps } from './timestamp'

export type ArticleContentType = 'trend' | 'evergreen' | 'comparison' | 'tutorial'
export type ArticleStatus = 'draft' | 'scheduled' | 'published'
export type ArticleGeneratedBy = 'ai' | 'human'
export type ArticleEventType = 'view' | 'dwell'

// Blog articles are global (no userId): the CMS lives in the control panel, not in a user account.
// A locale side exists iff its title AND body are both non-empty.
export const articles = pgTable('articles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  titleTh: text('title_th'),
  titleEn: text('title_en'),
  bodyMdTh: text('body_md_th'),
  bodyMdEn: text('body_md_en'),
  metaDescriptionTh: text('meta_description_th'),
  metaDescriptionEn: text('meta_description_en'),
  slugTh: text('slug_th'),
  slugEn: text('slug_en'),
  contentType: text('content_type').$type<ArticleContentType>().notNull().default('trend'),
  status: text('status').$type<ArticleStatus>().notNull().default('draft'),
  publishAt: instant('publish_at'),
  publishedAt: instant('published_at'),
  keywordId: text('keyword_id').references(() => cmsKeywords.id, { onDelete: 'set null' }),
  generatedBy: text('generated_by').$type<ArticleGeneratedBy>().notNull().default('human'),
  ...timestamps,
  deletedAt,
}, (t) => [
  index('articles_status_publish_at_idx').on(t.status, t.publishAt),
  // Partial: a soft-deleted article must not block its slug forever. Postgres treats
  // NULL slugs as distinct, so locale sides that do not exist stay unconstrained.
  uniqueIndex('articles_slug_th_idx').on(t.slugTh).where(sql`${t.deletedAt} is null`),
  uniqueIndex('articles_slug_en_idx').on(t.slugEn).where(sql`${t.deletedAt} is null`),
  uniqueIndex('articles_daily_ai_keyword_idx')
    .on(t.keywordId, sql`((${t.createdAt} AT TIME ZONE 'Asia/Bangkok')::date)`)
    .where(sql`${t.generatedBy} = 'ai' and ${t.contentType} = 'evergreen' and ${t.keywordId} is not null and ${t.deletedAt} is null`),
])

export const articleEvents = pgTable('article_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  type: text('type').$type<ArticleEventType>().notNull(),
  dwellSeconds: integer('dwell_seconds'),
  visitorHash: text('visitor_hash').notNull(),
  locale: text('locale').$type<CmsLocale>().notNull(),
  occurredAt: instant('occurred_at').notNull().defaultNow(),
}, (t) => [
  index('article_events_article_occurred_idx').on(t.articleId, t.occurredAt),
])
