import { articles, articleEvents } from '@mana/db'
import type { ArticleContentType, ArticleGeneratedBy, ArticleStatus } from '@mana/db'
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { db } from '@api/db'
import { ConflictError } from '@api/lib/errors'
import { deriveSlug } from '@api/modules/cms/slug'

type ArticleRow = typeof articles.$inferSelect

export type ArticleWire = {
  id: string
  titleTh: string | null
  titleEn: string | null
  bodyMdTh: string | null
  bodyMdEn: string | null
  metaDescriptionTh: string | null
  metaDescriptionEn: string | null
  slugTh: string | null
  slugEn: string | null
  contentType: ArticleContentType
  status: ArticleStatus
  generatedBy: ArticleGeneratedBy
  publishAt: string | null
  publishedAt: string | null
  keywordId: string | null
  viewCount: number
  createdAt: string
  updatedAt: string
}

export type FeedArticleWire = {
  id: string
  slugTh: string | null
  slugEn: string | null
  titleTh: string | null
  titleEn: string | null
  bodyMdTh: string | null
  bodyMdEn: string | null
  metaDescriptionTh: string | null
  metaDescriptionEn: string | null
  contentType: ArticleContentType
  publishedAt: string | null
  updatedAt: string
}

export type ArticleContentInput = {
  titleTh?: string | null
  titleEn?: string | null
  bodyMdTh?: string | null
  bodyMdEn?: string | null
  metaDescriptionTh?: string | null
  metaDescriptionEn?: string | null
  slugTh?: string | null
  slugEn?: string | null
  contentType?: ArticleContentType
  keywordId?: string | null
}

export type ListArticlesFilters = {
  status?: ArticleStatus
  contentType?: ArticleContentType
  q?: string
}

function toWire(row: ArticleRow, viewCount: number): ArticleWire {
  return {
    id: row.id,
    titleTh: row.titleTh,
    titleEn: row.titleEn,
    bodyMdTh: row.bodyMdTh,
    bodyMdEn: row.bodyMdEn,
    metaDescriptionTh: row.metaDescriptionTh,
    metaDescriptionEn: row.metaDescriptionEn,
    slugTh: row.slugTh,
    slugEn: row.slugEn,
    contentType: row.contentType,
    status: row.status,
    generatedBy: row.generatedBy,
    publishAt: row.publishAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    keywordId: row.keywordId,
    viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

async function viewCountsFor(articleIds: string[]): Promise<Map<string, number>> {
  if (articleIds.length === 0) return new Map()
  const rows = await db
    .select({ articleId: articleEvents.articleId, views: count() })
    .from(articleEvents)
    .where(and(inArray(articleEvents.articleId, articleIds), eq(articleEvents.type, 'view')))
    .groupBy(articleEvents.articleId)
  return new Map(rows.map((row) => [row.articleId, Number(row.views)]))
}

async function withViewCount(row: ArticleRow): Promise<ArticleWire> {
  const counts = await viewCountsFor([row.id])
  return toWire(row, counts.get(row.id) ?? 0)
}

async function findArticle(id: string): Promise<ArticleRow | null> {
  const [row] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, id), isNull(articles.deletedAt)))
  return row ?? null
}

async function uniqueSlug(
  column: typeof articles.slugTh | typeof articles.slugEn,
  slug: string | null,
  excludeId?: string,
): Promise<string | null> {
  if (!slug) return null
  let candidate = slug
  for (let attempt = 2; ; attempt++) {
    const conditions = [eq(column, candidate), isNull(articles.deletedAt)]
    const rows = await db.select({ id: articles.id }).from(articles).where(and(...conditions))
    const taken = rows.some((row) => row.id !== excludeId)
    if (!taken) return candidate
    candidate = `${slug}-${attempt}`
  }
}

function resolveSlug(
  locale: 'th' | 'en',
  provided: string | null | undefined,
  title: string | null | undefined,
): string | null {
  const trimmed = provided?.trim()
  if (trimmed) return trimmed
  return deriveSlug(locale, title)
}

export async function listArticles(filters: ListArticlesFilters): Promise<ArticleWire[]> {
  const conditions = [isNull(articles.deletedAt)]
  if (filters.status) conditions.push(eq(articles.status, filters.status))
  if (filters.contentType) conditions.push(eq(articles.contentType, filters.contentType))
  if (filters.q?.trim()) {
    const pattern = `%${filters.q.trim()}%`
    const search = or(
      ilike(articles.titleTh, pattern),
      ilike(articles.titleEn, pattern),
      ilike(articles.slugTh, pattern),
      ilike(articles.slugEn, pattern),
    )
    if (search) conditions.push(search)
  }

  const rows = await db
    .select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.createdAt))

  const counts = await viewCountsFor(rows.map((row) => row.id))
  return rows.map((row) => toWire(row, counts.get(row.id) ?? 0))
}

export async function getArticle(id: string): Promise<ArticleWire | null> {
  const row = await findArticle(id)
  return row ? withViewCount(row) : null
}

export type CreateArticleOptions = {
  generatedBy?: ArticleGeneratedBy
  status?: ArticleStatus
  publishAt?: Date | null
  publishedAt?: Date | null
}

export async function createArticle(
  input: ArticleContentInput,
  now: Date,
  { generatedBy = 'human', status = 'draft', publishAt = null, publishedAt = null }: CreateArticleOptions = {},
): Promise<ArticleWire> {
  const [row] = await db
    .insert(articles)
    .values({
      titleTh: input.titleTh ?? null,
      titleEn: input.titleEn ?? null,
      bodyMdTh: input.bodyMdTh ?? null,
      bodyMdEn: input.bodyMdEn ?? null,
      metaDescriptionTh: input.metaDescriptionTh ?? null,
      metaDescriptionEn: input.metaDescriptionEn ?? null,
      slugTh: await uniqueSlug(articles.slugTh, resolveSlug('th', input.slugTh, input.titleTh)),
      slugEn: await uniqueSlug(articles.slugEn, resolveSlug('en', input.slugEn, input.titleEn)),
      contentType: input.contentType ?? 'trend',
      status,
      publishAt,
      publishedAt,
      keywordId: input.keywordId ?? null,
      generatedBy,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return toWire(row, 0)
}

export async function patchArticle(
  id: string,
  input: ArticleContentInput,
  now: Date,
): Promise<ArticleWire | null> {
  const current = await findArticle(id)
  if (!current) return null

  const updates: Partial<typeof articles.$inferInsert> = { updatedAt: now }
  if ('titleTh' in input) updates.titleTh = input.titleTh ?? null
  if ('titleEn' in input) updates.titleEn = input.titleEn ?? null
  if ('bodyMdTh' in input) updates.bodyMdTh = input.bodyMdTh ?? null
  if ('bodyMdEn' in input) updates.bodyMdEn = input.bodyMdEn ?? null
  if ('metaDescriptionTh' in input) updates.metaDescriptionTh = input.metaDescriptionTh ?? null
  if ('metaDescriptionEn' in input) updates.metaDescriptionEn = input.metaDescriptionEn ?? null
  if ('contentType' in input && input.contentType) updates.contentType = input.contentType
  if ('keywordId' in input) updates.keywordId = input.keywordId ?? null

  const titleTh = 'titleTh' in input ? (input.titleTh ?? null) : current.titleTh
  const titleEn = 'titleEn' in input ? (input.titleEn ?? null) : current.titleEn
  if ('slugTh' in input || (!current.slugTh && titleTh)) {
    const next = resolveSlug('th', 'slugTh' in input ? input.slugTh : null, titleTh)
    updates.slugTh = await uniqueSlug(articles.slugTh, next, id)
  }
  if ('slugEn' in input || (!current.slugEn && titleEn)) {
    const next = resolveSlug('en', 'slugEn' in input ? input.slugEn : null, titleEn)
    updates.slugEn = await uniqueSlug(articles.slugEn, next, id)
  }

  const [row] = await db.update(articles).set(updates).where(eq(articles.id, id)).returning()
  return withViewCount(row)
}

export type ArticleMutation = { article: ArticleWire; rebuild: boolean }

export async function softDeleteArticle(id: string, now: Date): Promise<ArticleMutation | null> {
  const current = await findArticle(id)
  if (!current) return null

  const [row] = await db
    .update(articles)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(articles.id, id))
    .returning()

  return { article: toWire(row, 0), rebuild: current.status === 'published' }
}

export async function publishArticle(id: string, now: Date): Promise<ArticleMutation | null> {
  const current = await findArticle(id)
  if (!current) return null
  if (current.status === 'published') {
    throw new ConflictError('Article is already published')
  }

  const [row] = await db
    .update(articles)
    .set({ status: 'published', publishedAt: now, publishAt: null, updatedAt: now })
    .where(eq(articles.id, id))
    .returning()

  return { article: await withViewCount(row), rebuild: true }
}

export async function unpublishArticle(id: string, now: Date): Promise<ArticleMutation | null> {
  const current = await findArticle(id)
  if (!current) return null
  if (current.status !== 'published') {
    throw new ConflictError('Article is not published')
  }

  const [row] = await db
    .update(articles)
    .set({ status: 'draft', publishedAt: null, publishAt: null, updatedAt: now })
    .where(eq(articles.id, id))
    .returning()

  return { article: await withViewCount(row), rebuild: true }
}

export async function scheduleArticle(
  id: string,
  publishAt: Date,
  now: Date,
): Promise<ArticleWire | null> {
  const current = await findArticle(id)
  if (!current) return null
  if (current.status === 'published') {
    throw new ConflictError('Unpublish the article before scheduling it')
  }

  const [row] = await db
    .update(articles)
    .set({ status: 'scheduled', publishAt, publishedAt: null, updatedAt: now })
    .where(eq(articles.id, id))
    .returning()

  return withViewCount(row)
}

/** Flips every due scheduled article, keeping the jittered `publishAt` as the displayed date. */
export async function publishDueArticles(now: Date): Promise<number> {
  const due = await db
    .select({ id: articles.id })
    .from(articles)
    .where(
      and(
        eq(articles.status, 'scheduled'),
        isNull(articles.deletedAt),
        isNotNull(articles.publishAt),
        lte(articles.publishAt, now),
      ),
    )

  if (due.length === 0) return 0

  await db
    .update(articles)
    .set({ status: 'published', publishedAt: sql`${articles.publishAt}`, updatedAt: now })
    .where(inArray(articles.id, due.map((row) => row.id)))

  return due.length
}

export async function listPublishedArticles(): Promise<FeedArticleWire[]> {
  const rows = await db
    .select()
    .from(articles)
    .where(and(eq(articles.status, 'published'), isNull(articles.deletedAt)))
    .orderBy(desc(articles.publishedAt))

  return rows.map((row) => ({
    id: row.id,
    slugTh: row.slugTh,
    slugEn: row.slugEn,
    titleTh: row.titleTh,
    titleEn: row.titleEn,
    bodyMdTh: row.bodyMdTh,
    bodyMdEn: row.bodyMdEn,
    metaDescriptionTh: row.metaDescriptionTh,
    metaDescriptionEn: row.metaDescriptionEn,
    contentType: row.contentType,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }))
}
