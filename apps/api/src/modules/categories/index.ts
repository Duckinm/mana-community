import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { db } from '@api/db'
import { categories } from '@mana/db'
import { eq, and, asc } from 'drizzle-orm'
import { ensureCategory } from '@api/lib/ensure-category'
import { CategoriesListResponse, CategoryResponse, MessageResponse } from '@api/modules/categories/responses'
import { CreateCategoryBody } from '@api/lib/db-schema'

export const categoriesModule = new Elysia({ name: 'categories', prefix: '/api/categories' })
  .use(betterAuthPlugin)

  .get('/', async ({ user, query }) => {
    const conditions = [eq(categories.userId, user.id)]
    if (query.type) conditions.push(eq(categories.type, query.type))

    return db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
      })
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.name))
  }, {
    auth: true,
    query: t.Object({
      type: t.Optional(t.Union([t.Literal('revenue'), t.Literal('expense')])),
    }),
    response: { 200: CategoriesListResponse },
    detail: { tags: ['Finance'], summary: 'List finance categories' },
  })

  .post('/', async ({ body, user, status }) => {
    const type = body.type
    await ensureCategory(user.id, body.name, type)

    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        type: categories.type,
      })
      .from(categories)
      .where(and(eq(categories.userId, user.id), eq(categories.type, type)))

    const trimmed = body.name.trim()
    const row = rows.find((r) => r.name.toLowerCase() === trimmed.toLowerCase())
    if (!row) return status(500, { message: 'Failed to create category' })

    return status(201, row)
  }, {
    auth: true,
    body: CreateCategoryBody,
    response: { 201: CategoryResponse, 500: MessageResponse },
    detail: { tags: ['Finance'], summary: 'Create a finance category' },
  })
