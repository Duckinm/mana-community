import Elysia from 'elysia'
import { cron } from '@elysiajs/cron'
import { betterAuthPlugin } from '@api/lib/auth-plugin'
import { env } from '@api/env'
import {
  listProjects, createProject, patchProject, softDeleteProject,
  restoreProject, listTrashedProjects, duplicateProject, purgeOldTrash,
  createTask, patchTask, deleteTask, duplicateTask, reorderColumns,
  listMilestones, createMilestone, patchMilestone, deleteMilestone,
  getProjectCashflow,
} from '@api/modules/projects/service'
import {
  CreateProjectBody, UpdateProjectBody, CreateTaskBody, UpdateTaskBody, ReorderColumnsBody,
  CreateMilestoneBody, UpdateMilestoneBody,
} from '@api/modules/projects/model'
import {
  ProjectResponse,
  ProjectsListResponse,
  TaskResponse,
  MilestoneResponse,
  MilestonesListResponse,
  CashflowChartResponse,
  NotFoundResponse,
} from '@api/modules/projects/responses'
import { NoContentResponse } from '@api/lib/wire-schema'
import { registerCron } from '@api/lib/cron-monitor'
import { requireCronSecret } from '@api/lib/cron-secret'

export const projectsModule = new Elysia({ name: 'projects', prefix: '/api' })
  .use(betterAuthPlugin)
  .use(
    cron({
      ...registerCron('projects-daily-trash-purge', '0 4 * * *', purgeOldTrash),
    }),
  )

  .get('/projects', async ({ user }) => {
    return listProjects(user.id)
  }, {
    auth: true,
    response: { 200: ProjectsListResponse },
    detail: { tags: ['Projects'], summary: 'List projects' },
  })

  .post('/projects', async ({ user, status, body }) => {
    const project = await createProject(user.id, body)
    return status(201, project)
  }, {
    auth: true,
    body: CreateProjectBody,
    response: { 201: ProjectResponse },
    detail: { tags: ['Projects'], summary: 'Create project' },
  })

  .patch('/projects/:id', async ({ user, status, params, body }) => {
    const updated = await patchProject(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateProjectBody,
    response: { 200: ProjectResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Update project' },
  })

  .delete('/projects/:id', async ({ user, status, params }) => {
    const updated = await softDeleteProject(user.id, params.id)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    response: { 200: ProjectResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Soft-delete project' },
  })

  .post('/projects/:id/restore', async ({ user, status, params }) => {
    const updated = await restoreProject(user.id, params.id)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    response: { 200: ProjectResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Restore trashed project' },
  })

  .get('/projects/trash', async ({ user }) => {
    return listTrashedProjects(user.id)
  }, {
    auth: true,
    response: { 200: ProjectsListResponse },
    detail: { tags: ['Projects'], summary: 'List trashed projects' },
  })

  .post('/projects/:id/duplicate', async ({ user, status, params }) => {
    const copy = await duplicateProject(user.id, params.id)
    if (!copy) return status(404, { message: 'Not found' })
    return status(201, copy)
  }, {
    auth: true,
    response: { 201: ProjectResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Duplicate project' },
  })

  .post('/cron/cleanup-trash', async ({ request, status }) => {
    const unauthorized = requireCronSecret(request, status, env.CRON_SECRET)
    if (unauthorized) return unauthorized
    const deleted = await purgeOldTrash()
    return { deleted }
  }, { detail: { tags: ['Projects'], summary: 'Cron: purge old trashed projects', hide: true } })

  .post('/projects/:id/tasks', async ({ user, status, params, body }) => {
    const task = await createTask(user.id, params.id, body)
    return status(201, task)
  }, {
    auth: true,
    body: CreateTaskBody,
    response: { 201: TaskResponse },
    detail: { tags: ['Projects'], summary: 'Create task in project' },
  })

  .patch('/tasks/:id', async ({ user, status, params, body }) => {
    const updated = await patchTask(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateTaskBody,
    response: { 200: TaskResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Update task' },
  })

  .post('/tasks/:id/duplicate', async ({ user, status, params }) => {
    const copy = await duplicateTask(user.id, params.id)
    if (!copy) return status(404, { message: 'Not found' })
    return status(201, copy)
  }, {
    auth: true,
    response: { 201: TaskResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Duplicate task' },
  })

  .delete('/tasks/:id', async ({ user, status, params }) => {
    const deleted = await deleteTask(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Delete task' },
  })

  .put('/projects/:id/columns', async ({ user, status, body }) => {
    await reorderColumns(user.id, body.columns)
    return status(204, undefined)
  }, {
    auth: true,
    body: ReorderColumnsBody,
    response: { 204: NoContentResponse },
    detail: { tags: ['Projects'], summary: 'Reorder tasks in columns' },
  })

  .get('/projects/:id/cashflow', async ({ user, status, params }) => {
    const chart = await getProjectCashflow(user.id, params.id)
    if (!chart) return status(404, { message: 'Not found' })
    return chart
  }, {
    auth: true,
    response: { 200: CashflowChartResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Get project cashflow projection' },
  })

  .get('/projects/:id/milestones', async ({ user, params }) => {
    return listMilestones(user.id, params.id)
  }, {
    auth: true,
    response: { 200: MilestonesListResponse },
    detail: { tags: ['Projects'], summary: 'List project milestones' },
  })

  .post('/projects/:id/milestones', async ({ user, status, params, body }) => {
    const milestone = await createMilestone(user.id, params.id, body)
    return status(201, milestone)
  }, {
    auth: true,
    body: CreateMilestoneBody,
    response: { 201: MilestoneResponse },
    detail: { tags: ['Projects'], summary: 'Create milestone in project' },
  })

  .patch('/milestones/:id', async ({ user, status, params, body }) => {
    const updated = await patchMilestone(user.id, params.id, body)
    if (!updated) return status(404, { message: 'Not found' })
    return updated
  }, {
    auth: true,
    body: UpdateMilestoneBody,
    response: { 200: MilestoneResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Update milestone' },
  })

  .delete('/milestones/:id', async ({ user, status, params }) => {
    const deleted = await deleteMilestone(user.id, params.id)
    if (!deleted) return status(404, { message: 'Not found' })
    return status(204, undefined)
  }, {
    auth: true,
    response: { 204: NoContentResponse, 404: NotFoundResponse },
    detail: { tags: ['Projects'], summary: 'Delete milestone' },
  })
