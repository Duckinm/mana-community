import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { ErrorResponse } from '@api/lib/wire-schema'
import {
  LedgerEntriesResponse,
  LedgerEntry,
  LedgerSummaryResponse,
  ProfitTrendResponse,
  UserProfitabilityResponse,
} from '@api/modules/ledger/responses'
import {
  createLedgerEntry,
  deleteLedgerEntry,
  getLedgerSummary,
  getProfitTrend,
  getUserProfitability,
  listLedgerEntries,
} from '@api/modules/ledger/service'

const CalendarDate = t.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' })

export const ledgerModule = new Elysia({ name: 'ledger', prefix: '/api/ledger' })
  .use(betterAuthPlugin)

  .get('/entries', ({ query }) => listLedgerEntries(query.from, query.to), {
    admin: true,
    query: t.Object({
      from: t.Optional(CalendarDate),
      to: t.Optional(CalendarDate),
    }),
    response: { 200: LedgerEntriesResponse },
    detail: { tags: ['Ledger'], summary: 'List money ledger entries (newest first)' },
  })

  .post('/entries', ({ body }) => createLedgerEntry(body), {
    admin: true,
    body: t.Object({
      source: t.Union([
        t.Literal('stripe'),
        t.Literal('ai'),
        t.Literal('host'),
        t.Literal('domain'),
        t.Literal('db'),
        t.Literal('other'),
      ]),
      direction: t.Union([t.Literal('earn'), t.Literal('spend')]),
      amountCents: t.Integer({ minimum: 1 }),
      currency: t.String({ minLength: 3, maxLength: 3 }),
      date: CalendarDate,
      note: t.Optional(t.String({ maxLength: 500 })),
    }),
    response: { 200: LedgerEntry },
    detail: { tags: ['Ledger'], summary: 'Record a manual earn/spend ledger entry' },
  })

  .delete('/entries/:id', async ({ params, status }) => {
    const deleted = await deleteLedgerEntry(params.id)
    if (!deleted) return status(404, { error: 'Entry not found' })
    return { success: true }
  }, {
    admin: true,
    response: { 200: t.Object({ success: t.Boolean() }), 404: ErrorResponse },
    detail: { tags: ['Ledger'], summary: 'Delete a ledger entry' },
  })

  .get('/summary', ({ query }) => getLedgerSummary(query.granularity ?? 'month', query.from, query.to), {
    admin: true,
    query: t.Object({
      granularity: t.Optional(t.Union([t.Literal('day'), t.Literal('week'), t.Literal('month')])),
      from: t.Optional(CalendarDate),
      to: t.Optional(CalendarDate),
    }),
    response: { 200: LedgerSummaryResponse },
    detail: { tags: ['Ledger'], summary: 'Aggregate earn/spend by day, week, or month with totals and burn' },
  })

  .get(
    '/user-profitability',
    ({ query }) =>
      getUserProfitability(
        query.page ?? 1,
        query.pageSize ?? 50,
        query.sort ?? 'profit',
        query.dir ?? 'asc',
      ),
    {
      admin: true,
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        pageSize: t.Optional(t.Numeric({ minimum: 1, maximum: 200 })),
        sort: t.Optional(t.Union([t.Literal('revenue'), t.Literal('cost'), t.Literal('profit')])),
        dir: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
      }),
      response: { 200: UserProfitabilityResponse },
      detail: { tags: ['Ledger'], summary: 'Estimate profit per user (plan revenue minus AI cost), paginated' },
    },
  )

  .get('/profit-trend', ({ query }) => getProfitTrend(query.limit ?? 60), {
    admin: true,
    query: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 365 })),
    }),
    response: { 200: ProfitTrendResponse },
    detail: { tags: ['Ledger'], summary: 'Daily revenue vs. AI cost trend from stored profitability snapshots' },
  })
