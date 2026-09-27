import Elysia, { t } from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import {
  listSenderProfiles,
  createSenderProfile,
  patchSenderProfile,
  deleteSenderProfile,
  setDefaultSenderProfile,
  setSenderProfileImage,
  clearSenderProfileImage,
  listRemarkTemplates,
  createRemarkTemplate,
  patchRemarkTemplate,
  deleteRemarkTemplate,
  setDefaultRemarkTemplate,
} from '@api/modules/business/service'
import {
  SenderProfileResponse,
  SenderProfilesListResponse,
  RemarkTemplateResponse,
  RemarkTemplatesListResponse,
  BusinessDeleteResponse,
} from '@api/modules/business/model'
import {
  CreateSenderProfileBody,
  UpdateSenderProfileBody,
  CreateRemarkTemplateBody,
  UpdateRemarkTemplateBody,
  SetDefaultRemarkTemplateBody,
} from '@api/lib/db-schema'
import { NotFoundResponse, ErrorResponse, MessageResponse } from '@api/lib/wire-schema'

export const businessModule = new Elysia({ name: 'business', prefix: '/api/business' })
  .use(betterAuthPlugin)

  .get('/senderProfiles', async ({ user }) => {
    return listSenderProfiles(user.id)
  }, {
    auth: true,
    response: { 200: SenderProfilesListResponse },
    detail: { tags: ['Business'], summary: 'List sender profiles' },
  })

  .post('/senderProfiles', async ({ user, body, status }) => {
    const row = await createSenderProfile(user.id, body)
    return status(201, row)
  }, {
    auth: true,
    body: CreateSenderProfileBody,
    response: { 201: SenderProfileResponse },
    detail: { tags: ['Business'], summary: 'Create sender profile' },
  })

  .patch('/senderProfiles/:id', async ({ params, user, body, status }) => {
    const row = await patchSenderProfile(user.id, params.id, body)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateSenderProfileBody,
    response: { 200: SenderProfileResponse, 404: NotFoundResponse },
    detail: { tags: ['Business'], summary: 'Update sender profile' },
  })

  .delete('/senderProfiles/:id', async ({ params, user }) => {
    await deleteSenderProfile(user.id, params.id)
    return { success: true }
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    response: { 200: BusinessDeleteResponse },
    detail: { tags: ['Business'], summary: 'Delete sender profile' },
  })

  .post('/senderProfiles/:id/setDefault', async ({ params, user, status }) => {
    const found = await setDefaultSenderProfile(user.id, params.id)
    if (!found) return status(404, { message: 'Not found' })
    const profiles = await listSenderProfiles(user.id)
    const profile = profiles.find((p) => p.id === params.id)
    if (!profile) return status(404, { message: 'Not found' })
    return profile
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    response: { 200: SenderProfileResponse, 404: NotFoundResponse },
    detail: { tags: ['Business'], summary: 'Set sender profile as default' },
  })

  .post('/senderProfiles/:id/image/:kind', async ({ params, user, body, status }) => {
    if (!env.R2_ACCESS_KEY_ID) return status(503, { error: 'R2 not configured' })
    if (params.kind !== 'logo' && params.kind !== 'signature') {
      return status(400, { message: 'Invalid image kind' })
    }
    try {
      const row = await setSenderProfileImage(user.id, params.id, params.kind, body.data, body.mediaType)
      if (!row) return status(404, { message: 'Not found' })
      return row
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image upload failed'
      return status(400, { message })
    }
  }, {
    auth: true,
    params: t.Object({ id: t.String(), kind: t.String() }),
    body: t.Object({ data: t.String(), mediaType: t.String() }),
    response: { 200: SenderProfileResponse, 400: MessageResponse, 404: NotFoundResponse, 413: ErrorResponse, 503: ErrorResponse },
    detail: { tags: ['Business'], summary: 'Upload sender profile logo or signature' },
  })

  .delete('/senderProfiles/:id/image/:kind', async ({ params, user, status }) => {
    if (params.kind !== 'logo' && params.kind !== 'signature') {
      return status(400, { message: 'Invalid image kind' })
    }
    const row = await clearSenderProfileImage(user.id, params.id, params.kind)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, {
    auth: true,
    params: t.Object({ id: t.String(), kind: t.String() }),
    response: { 200: SenderProfileResponse, 400: MessageResponse, 404: NotFoundResponse },
    detail: { tags: ['Business'], summary: 'Remove sender profile logo or signature' },
  })

  .get('/remarkTemplates', async ({ user }) => {
    return listRemarkTemplates(user.id)
  }, {
    auth: true,
    response: { 200: RemarkTemplatesListResponse },
    detail: { tags: ['Business'], summary: 'List remark templates' },
  })

  .post('/remarkTemplates', async ({ user, body, status }) => {
    const row = await createRemarkTemplate(user.id, body)
    return status(201, row)
  }, {
    auth: true,
    body: CreateRemarkTemplateBody,
    response: { 201: RemarkTemplateResponse },
    detail: { tags: ['Business'], summary: 'Create remark template' },
  })

  .patch('/remarkTemplates/:id', async ({ params, user, body, status }) => {
    const row = await patchRemarkTemplate(user.id, params.id, body)
    if (!row) return status(404, { message: 'Not found' })
    return row
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateRemarkTemplateBody,
    response: { 200: RemarkTemplateResponse, 404: NotFoundResponse },
    detail: { tags: ['Business'], summary: 'Update remark template' },
  })

  .delete('/remarkTemplates/:id', async ({ params, user }) => {
    await deleteRemarkTemplate(user.id, params.id)
    return { success: true }
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    response: { 200: BusinessDeleteResponse },
    detail: { tags: ['Business'], summary: 'Delete remark template' },
  })

  .post('/remarkTemplates/:id/setDefault', async ({ params, user, body, status }) => {
    const found = await setDefaultRemarkTemplate(user.id, params.id, body.documentType)
    if (!found) return status(404, { message: 'Not found' })
    const templates = await listRemarkTemplates(user.id)
    const template = templates.find((row) => row.id === params.id)
    if (!template) return status(404, { message: 'Not found' })
    return template
  }, {
    auth: true,
    params: t.Object({ id: t.String() }),
    body: SetDefaultRemarkTemplateBody,
    response: { 200: RemarkTemplateResponse, 404: NotFoundResponse },
    detail: { tags: ['Business'], summary: 'Set remark template as default for a document type' },
  })
