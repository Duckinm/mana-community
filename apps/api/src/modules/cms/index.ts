import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import { ConflictError } from '@api/lib/errors'
import { triggerLandingRebuild } from '@api/lib/rebuild-landing'
import { MessageResponse, NotFoundResponse } from '@api/lib/wire-schema'
import { ingestPieces, validatePieces } from '@api/modules/cms/ingest'
import {
  ArticleReportResponse,
  ArticleResponse,
  ArticlesListResponse,
  CmsSettingsResponse,
  CompetitorResponse,
  CompetitorsListResponse,
  CreateArticleBody,
  CreateCompetitorBody,
  CreateKeywordBody,
  DashboardTodayResponse,
  IngestBody,
  IngestContextResponse,
  IngestRejectedResponse,
  IngestResponse,
  KeywordResponse,
  KeywordsListResponse,
  ListArticlesQuery,
  ReportRangeQuery,
  ReportsOverviewResponse,
  ScheduleArticleBody,
  UpdateCmsSettingsBody,
  UpdateCompetitorBody,
  UpdateKeywordBody,
  UpdateArticleBody,
} from '@api/modules/cms/model'
import { nextPublishSlot } from '@api/modules/cms/publish-window'
import {
  createCompetitor,
  createKeyword,
  deleteCompetitor,
  deleteKeyword,
  listCompetitors,
  listKeywords,
  nextKeyword,
  patchCompetitor,
  patchKeyword,
  readCmsSettings,
  updateCmsSettings,
} from '@api/modules/cms/registry-service'
import { articleReport, dashboardToday, gapDates, recentTitles, reportsOverview } from '@api/modules/cms/reports'
import {
  createArticle,
  getArticle,
  listArticles,
  patchArticle,
  publishArticle,
  scheduleArticle,
  softDeleteArticle,
  unpublishArticle,
} from '@api/modules/cms/service'

export type CmsDeps = {
  triggerRebuild?: () => Promise<void>
  now?: () => Date
  ingestSecret?: string
}

export function createCmsModule({
  triggerRebuild = triggerLandingRebuild,
  now = () => new Date(),
  ingestSecret = env.CMS_INGEST_SECRET,
}: CmsDeps = {}) {
  // Fails closed: with no secret configured the Generator endpoints are unreachable
  // rather than open, the same way the cron routes treat CRON_SECRET.
  const ingestAllowed = (request: Request) =>
    Boolean(ingestSecret) && request.headers.get('x-cms-ingest-secret') === ingestSecret

  return new Elysia({ name: 'cms', prefix: '/api/cms' })
    .use(betterAuthPlugin)

    .get('/articles', async ({ query }) => {
      const articles = await listArticles({
        status: query.status || undefined,
        contentType: query.contentType || undefined,
        q: query.q,
      })
      return { articles }
    }, {
      admin: true,
      query: ListArticlesQuery,
      response: { 200: ArticlesListResponse },
      detail: { tags: ['CMS'], summary: 'List blog articles' },
    })

    .post('/articles', async ({ body, status }) => {
      return status(201, await createArticle(body, now()))
    }, {
      admin: true,
      body: CreateArticleBody,
      response: { 201: ArticleResponse },
      detail: { tags: ['CMS'], summary: 'Create a draft article' },
    })

    .get('/articles/:id', async ({ params, status }) => {
      const article = await getArticle(params.id)
      if (!article) return status(404, { message: 'Not found' })
      return article
    }, {
      admin: true,
      response: { 200: ArticleResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Get one article' },
    })

    .patch('/articles/:id', async ({ params, body, status }) => {
      const article = await patchArticle(params.id, body, now())
      if (!article) return status(404, { message: 'Not found' })
      return article
    }, {
      admin: true,
      body: UpdateArticleBody,
      response: { 200: ArticleResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Edit article content' },
    })

    .delete('/articles/:id', async ({ params, status }) => {
      const result = await softDeleteArticle(params.id, now())
      if (!result) return status(404, { message: 'Not found' })
      if (result.rebuild) await triggerRebuild()
      return result.article
    }, {
      admin: true,
      response: { 200: ArticleResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Soft-delete an article' },
    })

    .post('/articles/:id/publish', async ({ params, status }) => {
      try {
        const result = await publishArticle(params.id, now())
        if (!result) return status(404, { message: 'Not found' })
        await triggerRebuild()
        return result.article
      } catch (err) {
        if (err instanceof ConflictError) return status(409, { message: err.message })
        throw err
      }
    }, {
      admin: true,
      response: { 200: ArticleResponse, 404: NotFoundResponse, 409: MessageResponse },
      detail: { tags: ['CMS'], summary: 'Publish an article now' },
    })

    .post('/articles/:id/unpublish', async ({ params, status }) => {
      try {
        const result = await unpublishArticle(params.id, now())
        if (!result) return status(404, { message: 'Not found' })
        await triggerRebuild()
        return result.article
      } catch (err) {
        if (err instanceof ConflictError) return status(409, { message: err.message })
        throw err
      }
    }, {
      admin: true,
      response: { 200: ArticleResponse, 404: NotFoundResponse, 409: MessageResponse },
      detail: { tags: ['CMS'], summary: 'Return a published article to draft' },
    })

    .post('/articles/:id/schedule', async ({ params, body, status }) => {
      const requested = body?.publishAt?.trim()
      const publishAt = requested ? new Date(requested) : nextPublishSlot(now())
      if (Number.isNaN(publishAt.getTime())) {
        return status(400, { message: 'publishAt must be an ISO timestamp' })
      }

      try {
        const article = await scheduleArticle(params.id, publishAt, now())
        if (!article) return status(404, { message: 'Not found' })
        return article
      } catch (err) {
        if (err instanceof ConflictError) return status(409, { message: err.message })
        throw err
      }
    }, {
      admin: true,
      body: ScheduleArticleBody,
      response: {
        200: ArticleResponse,
        400: MessageResponse,
        404: NotFoundResponse,
        409: MessageResponse,
      },
      detail: { tags: ['CMS'], summary: 'Schedule an article for the next publish window' },
    })

    .get('/keywords', async () => ({ keywords: await listKeywords() }), {
      admin: true,
      response: { 200: KeywordsListResponse },
      detail: { tags: ['CMS'], summary: 'List target keywords' },
    })

    .post('/keywords', async ({ body, status }) => status(201, await createKeyword(body, now())), {
      admin: true,
      body: CreateKeywordBody,
      response: { 201: KeywordResponse },
      detail: { tags: ['CMS'], summary: 'Add a target keyword' },
    })

    .patch('/keywords/:id', async ({ params, body, status }) => {
      const keyword = await patchKeyword(params.id, body, now())
      if (!keyword) return status(404, { message: 'Not found' })
      return keyword
    }, {
      admin: true,
      body: UpdateKeywordBody,
      response: { 200: KeywordResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Edit a keyword' },
    })

    .delete('/keywords/:id', async ({ params, status }) => {
      if (!(await deleteKeyword(params.id))) return status(404, { message: 'Not found' })
      return { message: 'Deleted' }
    }, {
      admin: true,
      response: { 200: MessageResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Delete a keyword' },
    })

    .get('/competitors', async () => ({ competitors: await listCompetitors() }), {
      admin: true,
      response: { 200: CompetitorsListResponse },
      detail: { tags: ['CMS'], summary: 'List tracked competitors' },
    })

    .post('/competitors', async ({ body, status }) => status(201, await createCompetitor(body, now())), {
      admin: true,
      body: CreateCompetitorBody,
      response: { 201: CompetitorResponse },
      detail: { tags: ['CMS'], summary: 'Add a competitor' },
    })

    .patch('/competitors/:id', async ({ params, body, status }) => {
      const competitor = await patchCompetitor(params.id, body, now())
      if (!competitor) return status(404, { message: 'Not found' })
      return competitor
    }, {
      admin: true,
      body: UpdateCompetitorBody,
      response: { 200: CompetitorResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Edit a competitor' },
    })

    .delete('/competitors/:id', async ({ params, status }) => {
      if (!(await deleteCompetitor(params.id))) return status(404, { message: 'Not found' })
      return { message: 'Deleted' }
    }, {
      admin: true,
      response: { 200: MessageResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Delete a competitor' },
    })

    .get('/settings', () => readCmsSettings(), {
      admin: true,
      response: { 200: CmsSettingsResponse },
      detail: { tags: ['CMS'], summary: 'Read CMS settings' },
    })

    .patch('/settings', ({ body }) => updateCmsSettings(body.autoPublish, now()), {
      admin: true,
      body: UpdateCmsSettingsBody,
      response: { 200: CmsSettingsResponse },
      detail: { tags: ['CMS'], summary: 'Toggle auto-publishing of generated articles' },
    })

    .get('/reports/article/:id', async ({ params, query, status }) => {
      const article = await getArticle(params.id)
      if (!article) return status(404, { message: 'Not found' })
      return articleReport(params.id, now(), query.from || undefined, query.to || undefined)
    }, {
      admin: true,
      query: ReportRangeQuery,
      response: { 200: ArticleReportResponse, 404: NotFoundResponse },
      detail: { tags: ['CMS'], summary: 'Views and dwell time for one article' },
    })

    .get('/reports/overview', () => reportsOverview(now()), {
      admin: true,
      response: { 200: ReportsOverviewResponse },
      detail: { tags: ['CMS'], summary: 'Traffic across all published articles' },
    })

    .get('/dashboard/today', () => dashboardToday(now()), {
      admin: true,
      response: { 200: DashboardTodayResponse },
      detail: { tags: ['CMS'], summary: "Today's generated pieces and recent gaps" },
    })

    .get('/ingest/context', async ({ request, status }) => {
      if (!ingestAllowed(request)) return status(401, { message: 'Unauthorized' })

      const [keywords, targetKeyword, competitors, settings] = await Promise.all([
        listKeywords(),
        nextKeyword(),
        listCompetitors(),
        readCmsSettings(),
      ])

      return {
        keywords: keywords.map(({ term, locale, priority }) => ({ term, locale, priority })),
        targetKeyword: targetKeyword && {
          term: targetKeyword.term,
          locale: targetKeyword.locale,
          priority: targetKeyword.priority,
        },
        competitors: competitors.map(({ name, url, notes }) => ({ name, url, notes })),
        recentTitles: await recentTitles(now()),
        gapDates: await gapDates(now()),
        autoPublish: settings.autoPublish,
      }
    }, {
      response: { 200: IngestContextResponse, 401: MessageResponse },
      detail: { tags: ['CMS'], summary: 'Planning context for the article generator' },
    })

    .post('/ingest', async ({ request, body, status }) => {
      if (!ingestAllowed(request)) return status(401, { message: 'Unauthorized' })

      const errors = validatePieces(body.pieces)
      if (errors.length > 0) {
        return status(400, { message: 'Some pieces are below the word minimum', errors })
      }

      const publishNow = body.publishNow === true
      let created
      try {
        created = await ingestPieces(body.pieces, now(), publishNow)
      } catch (err) {
        if (err instanceof ConflictError) return status(409, { message: err.message })
        throw err
      }
      if (publishNow && created.length > 0) await triggerRebuild()
      return status(201, { created })
    }, {
      body: IngestBody,
      response: {
        201: IngestResponse,
        400: IngestRejectedResponse,
        401: MessageResponse,
        409: MessageResponse,
      },
      detail: { tags: ['CMS'], summary: 'Ingest generated articles' },
    })
}

export const cmsModule = createCmsModule()
