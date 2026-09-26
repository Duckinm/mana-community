import Elysia from 'elysia'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { listLabels, createLabel, patchLabel, deleteLabel } from '@api/modules/labels/service'
import { CreateLabelBody, UpdateLabelBody, LabelResponse, LabelsListResponse } from '@api/modules/labels/model'
import { NotFoundResponse, NoContentResponse } from '@api/lib/wire-schema'

export const labelsModule = new Elysia({ name: 'labels', prefix: '/api/labels' })
  .use(betterAuthPlugin)

  .get('/', async ({ user }) => {
    return listLabels(user.id)
  }, { auth: true, response: { 200: LabelsListResponse }, detail: { tags: ['Labels'], summary: 'List labels' } })

  .post('/', async ({ user, status, body }) => {
    const label = await createLabel(user.id, body)
    return status(201, label)
  }, {
    auth: true,
    body: CreateLabelBody,
    response: { 201: LabelResponse },
    detail: { tags: ['Labels'], summary: 'Create label' },
  })

  .patch('/:id', async ({ user, status, params, body }) => {
    const updated = await patchLabel(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateLabelBody,
    response: { 200: LabelResponse, 404: NotFoundResponse },
    detail: { tags: ['Labels'], summary: 'Update label' },
  })

  .delete('/:id', async ({ user, status, params }) => {
    const deleted = await deleteLabel(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, { auth: true, response: { 204: NoContentResponse, 404: NotFoundResponse }, detail: { tags: ['Labels'], summary: 'Delete label' } })
