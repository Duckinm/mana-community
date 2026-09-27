import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import type { itemTemplates } from '@mana/db'
import { env } from '@api/env'
import {
  deleteTemplateImage,
  presignTemplateImage,
  uploadTemplateImage,
} from '@api/modules/item-templates/image'
import { itemTemplateToWire } from '@api/modules/item-templates/wire'
import {
  ItemTemplatesListResponse,
  ItemTemplateResponse,
  ItemTemplateImageUrlResponse,
  NotFoundResponse,
} from '@api/modules/item-templates/responses'
import { CreateItemTemplateBody, UpdateItemTemplateBody } from '@api/lib/db-schema'
import { NoContentResponse, ErrorResponse } from '@api/lib/wire-schema'
import {
  createItemTemplate,
  deleteItemTemplate,
  getOwnedItemTemplate,
  listItemTemplates,
  patchItemTemplate,
  patchItemTemplateImage,
} from '@api/modules/item-templates/service'

type TemplateRow = typeof itemTemplates.$inferSelect

async function withPresignedImages(rows: TemplateRow[]) {
  return Promise.all(
    rows.map(async (row) =>
      itemTemplateToWire(row, { imageUrl: await presignTemplateImage(row.imageR2Key) }),
    ),
  )
}

export const itemTemplatesModule = new Elysia({ name: 'item-templates', prefix: '/api/item-templates' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    const rows = await listItemTemplates(user.id)
    return withPresignedImages(rows)
  }, {
    auth: true,
    response: { 200: ItemTemplatesListResponse },
    detail: { tags: ['ItemTemplates'], summary: 'List item templates' },
  })

  .get('/:id/image-url', async ({ user, status, params }) => {
    const row = await getOwnedItemTemplate(user.id, params.id)
    if (!row) return status(404, { message: 'Not found' })
    if (!row.imageR2Key) return { url: null }
    const url = await presignTemplateImage(row.imageR2Key)
    return { url }
  }, {
    auth: true,
    response: { 200: ItemTemplateImageUrlResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Get presigned image URL for template' },
  })

  .post('/', async ({ user, status, body }) => {
    const created = await createItemTemplate(user.id, body)
    return status(201, itemTemplateToWire(created, {
      imageUrl: await presignTemplateImage(created.imageR2Key),
    }))
  }, {
    auth: true,
    body: CreateItemTemplateBody,
    response: { 201: ItemTemplateResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Create item template' },
  })

  .patch('/:id', async ({ user, status, params, body }) => {
    const updated = await patchItemTemplate(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return itemTemplateToWire(updated, {
      imageUrl: await presignTemplateImage(updated.imageR2Key),
    })
  }, {
    auth: true,
    body: UpdateItemTemplateBody,
    response: { 200: ItemTemplateResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Update item template' },
  })

  .post('/:id/image', async ({ user, params, body, status }) => {
    if (!env.R2_ACCESS_KEY_ID) {
      return status(503, { error: 'R2 not configured' })
    }

    const current = await getOwnedItemTemplate(user.id, params.id)
    if (!current) return status(404, { message: 'Not found' })

    let imageR2Key: string
    try {
      imageR2Key = await uploadTemplateImage(
        params.id,
        body.data,
        body.mediaType,
        current.imageR2Key,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed'
      return status(400, { message })
    }

    const updated = await patchItemTemplateImage(user.id, params.id, {
      imageR2Key,
      imageWidth: body.width,
      imageHeight: body.height,
      imageBlurDataUrl: body.blurDataUrl,
    })
    if (!updated) return status(404, { message: 'Not found' })

    return itemTemplateToWire(updated, {
      imageUrl: await presignTemplateImage(updated.imageR2Key),
    })
  }, {
    auth: true,
    body: t.Object({
      data: t.String(),
      mediaType: t.String(),
      width: t.Number(),
      height: t.Number(),
      blurDataUrl: t.String(),
    }),
    response: { 200: ItemTemplateResponse, 400: NotFoundResponse, 404: NotFoundResponse, 413: ErrorResponse, 503: ErrorResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Upload template image' },
  })

  .delete('/:id/image', async ({ user, params, status }) => {
    const current = await getOwnedItemTemplate(user.id, params.id)
    if (!current) return status(404, { message: 'Not found' })

    await deleteTemplateImage(current.imageR2Key)

    const updated = await patchItemTemplateImage(user.id, params.id, {
      imageR2Key: null,
      imageWidth: null,
      imageHeight: null,
      imageBlurDataUrl: null,
    })
    if (!updated) return status(404, { message: 'Not found' })

    return itemTemplateToWire(updated, { imageUrl: null })
  }, {
    auth: true,
    response: { 200: ItemTemplateResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Delete template image' },
  })

  .delete('/:id', async ({ user, status, params }) => {
    const current = await deleteItemTemplate(user.id, params.id)
    if (!current) return status(404, { message: 'Not found' })

    await deleteTemplateImage(current.imageR2Key)

    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['ItemTemplates'], summary: 'Delete item template' },
  })
