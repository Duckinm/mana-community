import { cmsKeywords } from '@mana/db'
import type { ArticleContentType } from '@mana/db'
import { db } from '@api/db'
import { ConflictError } from '@api/lib/errors'
import { nextPublishSlots } from '@api/modules/cms/publish-window'
import { nextKeyword, readCmsSettings } from '@api/modules/cms/registry-service'
import { createArticle } from '@api/modules/cms/service'

export type IngestPiece = {
  contentType: ArticleContentType
  titleTh: string
  titleEn: string
  bodyMdTh: string
  bodyMdEn: string
  metaDescriptionTh: string
  metaDescriptionEn: string
  slugTh?: string | null
  slugEn?: string | null
  keywordTerm?: string | null
}

export type IngestError = {
  index: number
  contentType: ArticleContentType
  locale: 'th' | 'en'
  words: number
  minimum: number
}

export type IngestedArticle = {
  id: string
  contentType: ArticleContentType
  status: 'draft' | 'scheduled' | 'published'
  publishAt: string | null
}

// Only the two research-heavy formats carry a length floor; comparison and tutorial
// pieces are judged by structure, not word count.
const WORD_MINIMUMS: Partial<Record<ArticleContentType, number>> = {
  trend: 500,
  evergreen: 800,
}
const DAILY_KEYWORD_MESSAGE = 'The daily keyword target changed; regenerate the article'
const DAILY_KEYWORD_INDEX = 'articles_daily_ai_keyword_idx'

// Thai is written without spaces, so whitespace splitting undercounts it by orders of magnitude.
const thaiSegmenter = new Intl.Segmenter('th', { granularity: 'word' })

export function countWords(locale: 'th' | 'en', text: string): number {
  if (locale === 'en') {
    return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
  }

  let words = 0
  for (const segment of thaiSegmenter.segment(text)) {
    if (segment.isWordLike) words++
  }
  return words
}

export function validatePieces(pieces: IngestPiece[]): IngestError[] {
  const errors: IngestError[] = []
  pieces.forEach((piece, index) => {
    const minimum = WORD_MINIMUMS[piece.contentType]
    if (!minimum) return
    for (const locale of ['th', 'en'] as const) {
      const words = countWords(locale, locale === 'th' ? piece.bodyMdTh : piece.bodyMdEn)
      if (words <= minimum) {
        errors.push({ index, contentType: piece.contentType, locale, words, minimum })
      }
    }
  })
  return errors
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase()
}

async function keywordIdsByTerm(terms: string[]): Promise<Map<string, string>> {
  if (terms.length === 0) return new Map()
  // the keyword registry holds dozens of rows — matching in memory beats a lower() IN clause
  const rows = await db.select({ id: cmsKeywords.id, term: cmsKeywords.term }).from(cmsKeywords)
  const wanted = new Set(terms.map(normalizeTerm))
  return new Map(
    rows.filter((row) => wanted.has(normalizeTerm(row.term))).map((row) => [normalizeTerm(row.term), row.id]),
  )
}

async function dailyKeyword(pieces: IngestPiece[]) {
  if (pieces.length !== 1 || pieces[0]?.contentType !== 'evergreen') return null
  const keyword = await nextKeyword()
  if (!keyword || pieces[0].keywordTerm !== keyword.term) throw new ConflictError(DAILY_KEYWORD_MESSAGE)
  return keyword
}

function isDailyKeywordConstraintError(error: unknown): boolean {
  const fields = error as { code?: unknown; constraint_name?: unknown }
  return fields.code === '23505' && fields.constraint_name === DAILY_KEYWORD_INDEX
}

export async function ingestPieces(
  pieces: IngestPiece[],
  now: Date,
  publishNow = false,
): Promise<IngestedArticle[]> {
  const targetKeyword = await dailyKeyword(pieces)
  const { autoPublish } = await readCmsSettings()
  const keywordIds = await keywordIdsByTerm(
    pieces.flatMap((piece) => (piece.keywordTerm ? [piece.keywordTerm] : [])),
  )
  const status = publishNow ? ('published' as const) : autoPublish ? ('scheduled' as const) : ('draft' as const)
  const slots = status === 'scheduled' ? nextPublishSlots(now, pieces.length) : []

  const created: IngestedArticle[] = []
  for (const [index, piece] of pieces.entries()) {
    // publishNow staggers timestamps a minute apart so displayed dates stay distinct,
    // mirroring what the Publish Window's per-piece jitter would have produced.
    const publishAt =
      status === 'published' ? new Date(now.getTime() + index * 60_000) : (slots[index] ?? null)
    const article = await createArticle(
      {
        titleTh: piece.titleTh,
        titleEn: piece.titleEn,
        bodyMdTh: piece.bodyMdTh,
        bodyMdEn: piece.bodyMdEn,
        metaDescriptionTh: piece.metaDescriptionTh,
        metaDescriptionEn: piece.metaDescriptionEn,
        slugTh: piece.slugTh ?? null,
        slugEn: piece.slugEn ?? null,
        contentType: piece.contentType,
        keywordId: targetKeyword?.id ?? (piece.keywordTerm ? (keywordIds.get(normalizeTerm(piece.keywordTerm)) ?? null) : null),
      },
      now,
      {
        generatedBy: 'ai',
        status,
        publishAt,
        publishedAt: status === 'published' ? publishAt : null,
      },
    ).catch((error) => {
      if (isDailyKeywordConstraintError(error)) throw new ConflictError(DAILY_KEYWORD_MESSAGE)
      throw error
    })

    created.push({
      id: article.id,
      contentType: article.contentType,
      status,
      publishAt: article.publishAt,
    })
  }

  return created
}
