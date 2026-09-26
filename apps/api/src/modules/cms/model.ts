import { t } from 'elysia'
import { IsoInstant, NullableIsoInstant, NullableString } from '@api/lib/wire-schema'

export const ArticleContentTypeSchema = t.Union([
  t.Literal('trend'),
  t.Literal('evergreen'),
  t.Literal('comparison'),
  t.Literal('tutorial'),
])

export const ArticleStatusSchema = t.Union([
  t.Literal('draft'),
  t.Literal('scheduled'),
  t.Literal('published'),
])

const ContentFields = {
  titleTh: t.Optional(NullableString),
  titleEn: t.Optional(NullableString),
  bodyMdTh: t.Optional(NullableString),
  bodyMdEn: t.Optional(NullableString),
  metaDescriptionTh: t.Optional(NullableString),
  metaDescriptionEn: t.Optional(NullableString),
  slugTh: t.Optional(NullableString),
  slugEn: t.Optional(NullableString),
  contentType: t.Optional(ArticleContentTypeSchema),
  keywordId: t.Optional(NullableString),
}

export const CreateArticleBody = t.Object(ContentFields)
export const UpdateArticleBody = t.Object(ContentFields)

export const ScheduleArticleBody = t.Optional(
  t.Object({ publishAt: t.Optional(NullableString) }),
)

// Empty strings are accepted so a cleared filter in the control panel is a no-op
// rather than a 422, while an unknown value still fails validation.
export const ListArticlesQuery = t.Object({
  status: t.Optional(t.Union([ArticleStatusSchema, t.Literal('')])),
  contentType: t.Optional(t.Union([ArticleContentTypeSchema, t.Literal('')])),
  q: t.Optional(t.String()),
})

export const ArticleResponse = t.Object({
  id: t.String(),
  titleTh: NullableString,
  titleEn: NullableString,
  bodyMdTh: NullableString,
  bodyMdEn: NullableString,
  metaDescriptionTh: NullableString,
  metaDescriptionEn: NullableString,
  slugTh: NullableString,
  slugEn: NullableString,
  contentType: ArticleContentTypeSchema,
  status: ArticleStatusSchema,
  generatedBy: t.Union([t.Literal('ai'), t.Literal('human')]),
  publishAt: NullableIsoInstant,
  publishedAt: NullableIsoInstant,
  keywordId: NullableString,
  viewCount: t.Number(),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})

export const ArticlesListResponse = t.Object({ articles: t.Array(ArticleResponse) })

export const PublishDueResponse = t.Object({ published: t.Number() })

export const CmsLocaleSchema = t.Union([t.Literal('th'), t.Literal('en')])

export const KeywordResponse = t.Object({
  id: t.String(),
  term: t.String(),
  locale: CmsLocaleSchema,
  priority: t.Number(),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})

export const KeywordsListResponse = t.Object({ keywords: t.Array(KeywordResponse) })

export const CreateKeywordBody = t.Object({
  term: t.String({ minLength: 1, maxLength: 200 }),
  locale: t.Optional(CmsLocaleSchema),
  priority: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})

export const UpdateKeywordBody = t.Object({
  term: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  locale: t.Optional(CmsLocaleSchema),
  priority: t.Optional(t.Integer({ minimum: 0, maximum: 100 })),
})

export const CompetitorResponse = t.Object({
  id: t.String(),
  name: t.String(),
  url: t.String(),
  notes: t.String(),
  createdAt: IsoInstant,
  updatedAt: IsoInstant,
})

export const CompetitorsListResponse = t.Object({ competitors: t.Array(CompetitorResponse) })

export const CreateCompetitorBody = t.Object({
  name: t.String({ minLength: 1, maxLength: 200 }),
  url: t.String({ minLength: 1, maxLength: 500 }),
  notes: t.Optional(t.String({ maxLength: 2000 })),
})

export const UpdateCompetitorBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
  url: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
  notes: t.Optional(t.String({ maxLength: 2000 })),
})

export const CmsSettingsResponse = t.Object({ autoPublish: t.Boolean() })
export const UpdateCmsSettingsBody = t.Object({ autoPublish: t.Boolean() })

const IngestPieceBody = t.Object({
  contentType: ArticleContentTypeSchema,
  titleTh: t.String({ minLength: 1 }),
  titleEn: t.String({ minLength: 1 }),
  bodyMdTh: t.String({ minLength: 1 }),
  bodyMdEn: t.String({ minLength: 1 }),
  metaDescriptionTh: t.String({ minLength: 1 }),
  metaDescriptionEn: t.String({ minLength: 1 }),
  slugTh: t.Optional(NullableString),
  slugEn: t.Optional(NullableString),
  keywordTerm: t.Optional(NullableString),
})

export const IngestBody = t.Object({
  pieces: t.Array(IngestPieceBody, { minItems: 1, maxItems: 20 }),
  // Skip the Publish Window and go live in this ingest — for backfills and manual pushes.
  publishNow: t.Optional(t.Boolean()),
})

export const IngestResponse = t.Object({
  created: t.Array(
    t.Object({
      id: t.String(),
      contentType: ArticleContentTypeSchema,
      status: t.Union([t.Literal('draft'), t.Literal('scheduled'), t.Literal('published')]),
      publishAt: NullableIsoInstant,
    }),
  ),
})

export const IngestRejectedResponse = t.Object({
  message: t.String(),
  errors: t.Array(
    t.Object({
      index: t.Number(),
      contentType: ArticleContentTypeSchema,
      locale: CmsLocaleSchema,
      words: t.Number(),
      minimum: t.Number(),
    }),
  ),
})

export const IngestContextResponse = t.Object({
  keywords: t.Array(t.Object({ term: t.String(), locale: CmsLocaleSchema, priority: t.Number() })),
  targetKeyword: t.Union([
    t.Object({ term: t.String(), locale: CmsLocaleSchema, priority: t.Number() }),
    t.Null(),
  ]),
  competitors: t.Array(t.Object({ name: t.String(), url: t.String(), notes: t.String() })),
  recentTitles: t.Array(t.String()),
  gapDates: t.Array(t.String()),
  autoPublish: t.Boolean(),
})

const CalendarDate = t.Union([t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }), t.Literal('')])

export const ReportRangeQuery = t.Object({
  from: t.Optional(CalendarDate),
  to: t.Optional(CalendarDate),
})

export const ArticleReportResponse = t.Object({
  totals: t.Object({ views: t.Number(), avgDwellSeconds: t.Number() }),
  daily: t.Array(
    t.Object({ date: t.String(), views: t.Number(), avgDwellSeconds: t.Number() }),
  ),
})

export const ReportsOverviewResponse = t.Object({
  articles: t.Array(
    t.Object({
      id: t.String(),
      titleTh: NullableString,
      titleEn: NullableString,
      contentType: ArticleContentTypeSchema,
      publishedAt: NullableIsoInstant,
      views: t.Number(),
      avgDwellSeconds: t.Number(),
    }),
  ),
  daily: t.Array(t.Object({ date: t.String(), views: t.Number() })),
})

export const DashboardTodayResponse = t.Object({
  date: t.String(),
  pieces: t.Array(
    t.Object({
      contentType: ArticleContentTypeSchema,
      articleId: NullableString,
      status: t.Union([ArticleStatusSchema, t.Null()]),
      publishAt: NullableIsoInstant,
    }),
  ),
  gapDates: t.Array(t.String()),
})

export const BlogFeedResponse = t.Object({
  articles: t.Array(
    t.Object({
      id: t.String(),
      slugTh: NullableString,
      slugEn: NullableString,
      titleTh: NullableString,
      titleEn: NullableString,
      bodyMdTh: NullableString,
      bodyMdEn: NullableString,
      metaDescriptionTh: NullableString,
      metaDescriptionEn: NullableString,
      contentType: ArticleContentTypeSchema,
      publishedAt: NullableIsoInstant,
      updatedAt: IsoInstant,
    }),
  ),
})
