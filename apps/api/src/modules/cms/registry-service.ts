import { articles, cmsCompetitors, cmsKeywords, cmsSettings } from '@mana/db'
import type { CmsLocale } from '@mana/db'
import { and, asc, desc, eq, isNotNull, isNull, max } from 'drizzle-orm'
import { db } from '@api/db'

export type KeywordWire = {
  id: string
  term: string
  locale: CmsLocale
  priority: number
  createdAt: string
  updatedAt: string
}

export type CompetitorWire = {
  id: string
  name: string
  url: string
  notes: string
  createdAt: string
  updatedAt: string
}

type KeywordRow = typeof cmsKeywords.$inferSelect
type CompetitorRow = typeof cmsCompetitors.$inferSelect

function keywordWire(row: KeywordRow): KeywordWire {
  return {
    id: row.id,
    term: row.term,
    locale: row.locale,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function competitorWire(row: CompetitorRow): CompetitorWire {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listKeywords(): Promise<KeywordWire[]> {
  const rows = await db
    .select()
    .from(cmsKeywords)
    .orderBy(desc(cmsKeywords.priority), asc(cmsKeywords.term))
  return rows.map(keywordWire)
}

export async function nextKeyword(): Promise<KeywordWire | null> {
  const [keywords, usageRows] = await Promise.all([
    listKeywords(),
    db
      .select({ keywordId: articles.keywordId, lastUsedAt: max(articles.createdAt) })
      .from(articles)
      .where(and(
        eq(articles.generatedBy, 'ai'),
        eq(articles.contentType, 'evergreen'),
        isNull(articles.deletedAt),
        isNotNull(articles.keywordId),
      ))
      .groupBy(articles.keywordId),
  ])
  const lastUsedAt = new Map<string, number>()
  for (const row of usageRows) {
    if (row.keywordId && row.lastUsedAt) lastUsedAt.set(row.keywordId, row.lastUsedAt.getTime())
  }

  return [...keywords].sort((a, b) => {
    const usageDelta = (lastUsedAt.get(a.id) ?? -Infinity) - (lastUsedAt.get(b.id) ?? -Infinity)
    return usageDelta || b.priority - a.priority || a.term.localeCompare(b.term)
  })[0] ?? null
}

export async function createKeyword(
  input: { term: string; locale?: CmsLocale; priority?: number },
  now: Date,
): Promise<KeywordWire> {
  const [row] = await db
    .insert(cmsKeywords)
    .values({
      term: input.term.trim(),
      locale: input.locale ?? 'th',
      priority: input.priority ?? 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return keywordWire(row)
}

export async function patchKeyword(
  id: string,
  input: { term?: string; locale?: CmsLocale; priority?: number },
  now: Date,
): Promise<KeywordWire | null> {
  const updates: Partial<typeof cmsKeywords.$inferInsert> = { updatedAt: now }
  if (input.term !== undefined) updates.term = input.term.trim()
  if (input.locale !== undefined) updates.locale = input.locale
  if (input.priority !== undefined) updates.priority = input.priority

  const [row] = await db.update(cmsKeywords).set(updates).where(eq(cmsKeywords.id, id)).returning()
  return row ? keywordWire(row) : null
}

export async function deleteKeyword(id: string): Promise<boolean> {
  const deleted = await db.delete(cmsKeywords).where(eq(cmsKeywords.id, id)).returning({ id: cmsKeywords.id })
  return deleted.length > 0
}

export async function listCompetitors(): Promise<CompetitorWire[]> {
  const rows = await db.select().from(cmsCompetitors).orderBy(asc(cmsCompetitors.name))
  return rows.map(competitorWire)
}

export async function createCompetitor(
  input: { name: string; url: string; notes?: string },
  now: Date,
): Promise<CompetitorWire> {
  const [row] = await db
    .insert(cmsCompetitors)
    .values({
      name: input.name.trim(),
      url: input.url.trim(),
      notes: input.notes ?? '',
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return competitorWire(row)
}

export async function patchCompetitor(
  id: string,
  input: { name?: string; url?: string; notes?: string },
  now: Date,
): Promise<CompetitorWire | null> {
  const updates: Partial<typeof cmsCompetitors.$inferInsert> = { updatedAt: now }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.url !== undefined) updates.url = input.url.trim()
  if (input.notes !== undefined) updates.notes = input.notes

  const [row] = await db
    .update(cmsCompetitors)
    .set(updates)
    .where(eq(cmsCompetitors.id, id))
    .returning()
  return row ? competitorWire(row) : null
}

export async function deleteCompetitor(id: string): Promise<boolean> {
  const deleted = await db
    .delete(cmsCompetitors)
    .where(eq(cmsCompetitors.id, id))
    .returning({ id: cmsCompetitors.id })
  return deleted.length > 0
}

/** Read-or-create: the settings row is a singleton keyed `default`. */
export async function readCmsSettings(): Promise<{ autoPublish: boolean }> {
  const [row] = await db.select().from(cmsSettings).where(eq(cmsSettings.id, 'default'))
  if (row) return { autoPublish: row.autoPublish }

  const [created] = await db
    .insert(cmsSettings)
    .values({ id: 'default' })
    .onConflictDoNothing()
    .returning()
  return { autoPublish: created?.autoPublish ?? true }
}

export async function updateCmsSettings(autoPublish: boolean, now: Date): Promise<{ autoPublish: boolean }> {
  const [row] = await db
    .insert(cmsSettings)
    .values({ id: 'default', autoPublish, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: cmsSettings.id,
      set: { autoPublish, updatedAt: now },
    })
    .returning()
  return { autoPublish: row.autoPublish }
}
