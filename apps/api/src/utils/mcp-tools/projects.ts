import { eq, and, asc, count, gte, isNull, inArray, lte } from 'drizzle-orm'
import { contacts, projects, tasks, labels, TASK_STATUSES, parseTaskStatus } from '@mana/db'
import { db } from '@api/db'
import { logTasksBulkCompleted } from '@api/lib/activity'
import { textToTiptapDoc, tiptapDocToText, type TiptapDoc } from '@api/lib/rich-text'
import { CALENDAR_DATE_RE, calendarDateFromTimestamp, todayCalendarDate, calendarDateDaysFromToday } from '@api/lib/calendar-date'
import {
  patchTask,
  patchProject,
  softDeleteProject,
  restoreProject,
  duplicateProject,
  duplicateTask,
  createProject,
  createTask,
  listTrashedProjects,
  taskRowToClientDto,
} from '@api/modules/projects/service'
import type { ToolContext } from '@api/utils/mcp-tools/tool-context'

type McpToolHandler = (userId: string, args: Record<string, unknown>, context?: ToolContext) => Promise<unknown>

type ProjectRow = typeof projects.$inferSelect
type TaskRow = typeof tasks.$inferSelect

const EXTERNAL_LIST_DEFAULT_LIMIT = 50
const EXTERNAL_LIST_MAX_LIMIT = 100
const TASK_PRIORITIES = ['low', 'med', 'high'] as const

interface TaskListFilters {
  status?: string
  priority?: string
  dueBefore?: string
  dueAfter?: string
}

interface CreateTaskArgs {
  projectId: string
  title: string
  status?: string
  priority?: string
  due?: string
  labelIds?: string[]
}

interface CreateProjectArgs {
  name: string
  client?: string
  color?: string
  startDate?: string
  dueDate?: string
  description?: TiptapDoc | null
}

async function queryProjects(userId: string, includeArchived = false) {
  const [userProjects, userTasks, userLabels] = await Promise.all([
    db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
          includeArchived ? undefined : eq(projects.archived, false),
        ),
      ),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(asc(tasks.position)),
    db.select().from(labels).where(eq(labels.userId, userId)),
  ])

  return userProjects.map((p: ProjectRow) => ({
    id: p.id,
    name: p.name,
    client: p.client,
    color: p.color,
    startDate: p.startDate ?? '',
    dueDate: p.dueDate ?? '',
    description: tiptapDocToText(p.description),
    archived: p.archived,
    deletedAt: p.deletedAt ?? null,
    tasks: projectTaskSummaries(p, userTasks.filter((t: TaskRow) => t.projectId === p.id), userLabels),
  }))
}

function projectTaskSummaries(
  project: ProjectRow,
  rows: TaskRow[],
  userLabels: (typeof labels.$inferSelect)[],
) {
  return rows.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    due: task.due ?? '',
    labels: taskRowToClientDto(task, project.client, userLabels, project.prefix).labels,
  }))
}

function externalListLimit(args: Record<string, unknown>, context?: ToolContext) {
  if (context?.source !== 'external-mcp') return null
  const value = args.limit
  if (value === undefined) return EXTERNAL_LIST_DEFAULT_LIMIT
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > EXTERNAL_LIST_MAX_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${EXTERNAL_LIST_MAX_LIMIT}`)
  }
  return value
}

async function queryProjectsBounded(userId: string, includeArchived: boolean, limit: number) {
  const rows = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        isNull(projects.deletedAt),
        includeArchived ? undefined : eq(projects.archived, false),
      ),
    )
    .orderBy(asc(projects.createdAt))
    .limit(limit + 1)
  const visible = rows.slice(0, limit)
  const projectIds = visible.map((project) => project.id)
  const taskCounts = projectIds.length === 0
    ? []
    : await db
        .select({ projectId: tasks.projectId, total: count() })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), inArray(tasks.projectId, projectIds)))
        .groupBy(tasks.projectId)
  const taskCountByProjectId = new Map(taskCounts.map((row) => [row.projectId, Number(row.total)]))

  return {
    items: visible.map((project) => ({
      id: project.id,
      name: project.name,
      client: project.client,
      color: project.color,
      startDate: project.startDate ?? '',
      dueDate: project.dueDate ?? '',
      description: tiptapDocToText(project.description),
      archived: project.archived,
      deletedAt: project.deletedAt ?? null,
      taskCount: taskCountByProjectId.get(project.id) ?? 0,
    })),
    limit,
    hasMore: rows.length > limit,
  }
}

async function activeProjectIds(userId: string) {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.userId, userId), isNull(projects.deletedAt), eq(projects.archived, false)))
  return rows.map((p) => p.id)
}

function taskListFilters(args: Record<string, unknown>): TaskListFilters {
  const status = args.status
  if (status !== undefined && (typeof status !== 'string' || !(TASK_STATUSES as readonly string[]).includes(status))) {
    throw new Error('status must be one of todo, in-progress, done, canceled')
  }
  const priority = args.priority
  if (priority !== undefined && (typeof priority !== 'string' || !(TASK_PRIORITIES as readonly string[]).includes(priority))) {
    throw new Error('priority must be one of low, med, high')
  }
  const dueBefore = args.dueBefore
  const dueAfter = args.dueAfter
  if (dueBefore !== undefined && (typeof dueBefore !== 'string' || !CALENDAR_DATE_RE.test(dueBefore))) {
    throw new Error('dueBefore must be YYYY-MM-DD')
  }
  if (dueAfter !== undefined && (typeof dueAfter !== 'string' || !CALENDAR_DATE_RE.test(dueAfter))) {
    throw new Error('dueAfter must be YYYY-MM-DD')
  }
  if (typeof dueBefore === 'string' && typeof dueAfter === 'string' && dueAfter > dueBefore) {
    throw new Error('dueAfter must be on or before dueBefore')
  }
  return { status, priority, dueBefore, dueAfter }
}

async function queryTasks(
  userId: string,
  projectId?: string,
  includeArchived = false,
  filters: TaskListFilters = {},
) {
  const scopeIds = projectId ? [projectId] : includeArchived ? null : await activeProjectIds(userId)

  const [userLabels, userProjects] = await Promise.all([
    db.select().from(labels).where(eq(labels.userId, userId)),
    db.select().from(projects).where(eq(projects.userId, userId)),
  ])

  const rows: TaskRow[] =
    scopeIds && scopeIds.length === 0
      ? []
      : await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              scopeIds ? inArray(tasks.projectId, scopeIds) : undefined,
              filters.status ? eq(tasks.status, filters.status) : undefined,
              filters.priority ? eq(tasks.priority, filters.priority) : undefined,
              filters.dueAfter ? gte(tasks.due, filters.dueAfter) : undefined,
              filters.dueBefore ? lte(tasks.due, filters.dueBefore) : undefined,
            ),
          )
          .orderBy(asc(tasks.position))

  return taskDtos(rows, userLabels, userProjects)
}

function taskDtos(
  rows: TaskRow[],
  userLabels: (typeof labels.$inferSelect)[],
  userProjects: ProjectRow[],
) {
  const projectById = new Map(userProjects.map((project) => [project.id, project]))
  return rows.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    status: t.status,
    priority: t.priority,
    due: t.due ?? '',
    createdAt: calendarDateFromTimestamp(t.createdAt),
    labels: taskRowToClientDto(
      t,
      projectById.get(t.projectId)?.client ?? '',
      userLabels,
      projectById.get(t.projectId)?.prefix ?? '',
    ).labels,
  }))
}

async function queryTasksBounded(
  userId: string,
  projectId: string | undefined,
  includeArchived: boolean,
  limit: number,
  filters: TaskListFilters,
) {
  const scopeIds = projectId ? [projectId] : includeArchived ? null : await activeProjectIds(userId)
  const rows: TaskRow[] = scopeIds && scopeIds.length === 0
    ? []
    : await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, userId),
            scopeIds ? inArray(tasks.projectId, scopeIds) : undefined,
            filters.status ? eq(tasks.status, filters.status) : undefined,
            filters.priority ? eq(tasks.priority, filters.priority) : undefined,
            filters.dueAfter ? gte(tasks.due, filters.dueAfter) : undefined,
            filters.dueBefore ? lte(tasks.due, filters.dueBefore) : undefined,
          ),
        )
        .orderBy(asc(tasks.position))
        .limit(limit + 1)
  const visible = rows.slice(0, limit)
  const projectIds = [...new Set(visible.map((task) => task.projectId))]
  const [userLabels, userProjects] = await Promise.all([
    db.select().from(labels).where(eq(labels.userId, userId)),
    projectIds.length === 0
      ? []
      : db.select().from(projects).where(and(eq(projects.userId, userId), inArray(projects.id, projectIds))),
  ])

  return {
    items: taskDtos(visible, userLabels, userProjects),
    limit,
    hasMore: rows.length > limit,
  }
}

async function mcpCreateTask(userId: string, args: CreateTaskArgs) {
  return createTask(userId, args.projectId, {
    title: args.title,
    status: args.status ?? 'todo',
    priority: args.priority,
    due: args.due,
    labelIds: args.labelIds,
  })
}

function optionalStringArray(args: Record<string, unknown>, key: string): string[] | undefined {
  const value = args[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${key} must be an array of strings`)
  }
  return value
}

async function updateTaskStatus(userId: string, taskId: string, status: string) {
  return patchTask(userId, taskId, { status })
}

async function archiveTask(userId: string, taskId: string) {
  const updated = await patchTask(userId, taskId, { status: 'canceled' })
  return updated ? { archived: true, id: updated.id, title: updated.title } : { archived: false }
}

async function mcpCreateProject(userId: string, args: CreateProjectArgs) {
  const p = await createProject(userId, {
    name: args.name,
    client: args.client,
    color: args.color,
    startDate: args.startDate,
    dueDate: args.dueDate,
    description: args.description,
  })
  return {
    id: p.id,
    name: p.name,
    client: p.client,
    color: p.color,
    startDate: p.startDate,
    dueDate: p.dueDate,
    description: tiptapDocToText(p.description),
  }
}

async function archiveProject(userId: string, projectId: string) {
  const [current] = await db
    .select({ archived: projects.archived })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  if (!current) return { found: false, message: 'Project not found' }
  const newValue = !current.archived
  await patchProject(userId, projectId, { archived: newValue })
  return { projectId, archived: newValue }
}

async function getProject(userId: string, projectId: string) {
  const all = await queryProjects(userId, true)
  const project = all.find((p) => p.id === projectId)
  return project ?? { found: false, message: 'Project not found' }
}

async function getProjectBounded(userId: string, projectId: string, limit: number) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId), isNull(projects.deletedAt)))
    .limit(1)
  if (!project) return { found: false, message: 'Project not found' }

  const [rows, userLabels] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.projectId, project.id)))
      .orderBy(asc(tasks.position))
      .limit(limit + 1),
    db.select().from(labels).where(eq(labels.userId, userId)),
  ])
  const visible = rows.slice(0, limit)

  return {
    id: project.id,
    name: project.name,
    client: project.client,
    color: project.color,
    startDate: project.startDate ?? '',
    dueDate: project.dueDate ?? '',
    description: tiptapDocToText(project.description),
    archived: project.archived,
    deletedAt: project.deletedAt ?? null,
    tasks: {
      items: projectTaskSummaries(project, visible, userLabels),
      limit,
      hasMore: rows.length > limit,
    },
  }
}

async function bulkUpdateTaskStatus(userId: string, taskIds: string[], status: string) {
  const canonicalStatus = parseTaskStatus(status)
  await db.update(tasks)
    .set({ status: canonicalStatus, updatedAt: new Date() })
    .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
  if (canonicalStatus === 'done') {
    logTasksBulkCompleted(taskIds, userId)
  }
  return { updated: taskIds.length, taskIds }
}

export async function getOverdueTasks(userId: string) {
  const today = todayCalendarDate()
  const all = await queryTasks(userId)
  return all.filter((t) => t.due && t.due < today && t.status !== 'done' && t.status !== 'canceled')
}

async function getTasksByStatus(userId: string, projectId?: string) {
  const all = await queryTasks(userId, projectId)
  const grouped = Object.fromEntries(TASK_STATUSES.map((status) => [status, [] as typeof all])) as Record<
    (typeof TASK_STATUSES)[number],
    typeof all
  >
  for (const t of all) {
    if ((TASK_STATUSES as readonly string[]).includes(t.status)) {
      grouped[t.status as (typeof TASK_STATUSES)[number]].push(t)
    }
  }
  return grouped
}

async function getTasksByPriority(userId: string, projectId?: string) {
  const all = await queryTasks(userId, projectId)
  const grouped = Object.fromEntries(TASK_PRIORITIES.map((p) => [p, [] as typeof all])) as Record<
    (typeof TASK_PRIORITIES)[number],
    typeof all
  >
  for (const t of all) {
    const key = (TASK_PRIORITIES as readonly string[]).includes(t.priority)
      ? (t.priority as (typeof TASK_PRIORITIES)[number])
      : 'med'
    grouped[key].push(t)
  }
  return grouped
}

async function getProjectCompletion(userId: string) {
  const all = await queryProjects(userId)
  return all.map((p) => {
    const total = p.tasks.length
    const done = p.tasks.filter((t) => t.status === 'done').length
    return {
      projectId: p.id,
      projectName: p.name,
      totalTasks: total,
      doneTasks: done,
      completionPercent: total === 0 ? 0 : Math.round((done / total) * 100),
    }
  })
}

export async function getTasksDueThisWeek(userId: string) {
  const today = todayCalendarDate()
  const sevenDaysLater = calendarDateDaysFromToday(7)
  const all = await queryTasks(userId)
  return all.filter(
    (t) => t.due && t.due >= today && t.due <= sevenDaysLater && t.status !== 'done' && t.status !== 'canceled',
  )
}

async function linkContactToProject(userId: string, contactId: string, projectId: string) {
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
    .limit(1)
  if (!contact) return { success: false, message: 'Contact not found' }

  const [updated] = await db
    .update(projects)
    .set({ contactId, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning({ id: projects.id })

  if (!updated) return { success: false, message: 'Project not found' }
  return { success: true, projectId, contactId }
}

export const projectTools = [
  {
    name: 'get_projects',
    description:
      'List the user\'s active projects. External MCP returns a bounded summary with taskCount; use get_tasks for task details. Archived projects are excluded unless explicitly requested.',
    input_schema: {
      type: 'object' as const,
      properties: {
        includeArchived: { type: 'boolean', description: 'Include archived projects. Default false.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: EXTERNAL_LIST_MAX_LIMIT,
          default: EXTERNAL_LIST_DEFAULT_LIMIT,
          description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full project context.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_project',
    description: 'Get full details for a single project by ID. External MCP receives its tasks as a bounded { items, limit, hasMore } result.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: EXTERNAL_LIST_MAX_LIMIT,
          default: EXTERNAL_LIST_DEFAULT_LIMIT,
          description: 'External MCP task response limit. Default 50, maximum 100; the in-app assistant keeps full project detail.',
        },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_project',
    description:
      'Create a new project. Only name is required — call create_project as soon as you have a project name. Do not ask the user for optional fields (client, dates, description, color) unless they volunteered them.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Project name (required)' },
        client: { type: 'string', description: 'Client name (optional)' },
        color: { type: 'string', description: 'Hex color, optional, e.g. #D4A843' },
        startDate: { type: 'string', description: 'Start date YYYY-MM-DD (optional)' },
        dueDate: { type: 'string', description: 'Due date YYYY-MM-DD (optional)' },
        description: { type: 'string', description: 'Overview description (optional)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_project',
    description: 'Update fields on an existing project (name, client, dates, description, color)',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        name: { type: 'string' },
        client: { type: 'string' },
        startDate: { type: 'string', description: 'YYYY-MM-DD' },
        dueDate: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
        color: { type: 'string', description: 'Hex color e.g. #D4A843' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'delete_project',
    description: 'Soft-delete a project (moves it to trash, recoverable for 14 days). Does not free an active-project slot until permanently purged.',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'restore_project',
    description:
      'Restore a soft-deleted project from trash.',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'duplicate_project',
    description:
      'Duplicate a project (creates a copy with "(copy)" suffix, no tasks copied).',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'archive_project',
    description:
      'Toggle the archived state of a project — if currently active it will be archived, if already archived it will be unarchived. Unarchiving counts toward the active-project cap.',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string' } },
      required: ['projectId'],
    },
  },
  {
    name: 'get_tasks',
    description:
      'List tasks from active projects, optionally filtered by project. External MCP returns a bounded { items, limit, hasMore } result. Tasks in archived projects are excluded unless includeArchived is set or a specific projectId is given.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Optional project ID to filter by' },
        includeArchived: { type: 'boolean', description: 'Include tasks from archived projects. Default false.' },
        status: { type: 'string', enum: [...TASK_STATUSES], description: 'Only tasks with this status.' },
        priority: { type: 'string', enum: [...TASK_PRIORITIES], description: 'Only tasks with this priority.' },
        dueBefore: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Only tasks due on or before this YYYY-MM-DD date.' },
        dueAfter: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Only tasks due on or after this YYYY-MM-DD date.' },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: EXTERNAL_LIST_MAX_LIMIT,
          default: EXTERNAL_LIST_DEFAULT_LIMIT,
          description: 'External MCP response limit. Default 50, maximum 100; the in-app assistant keeps its full task context.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in a project. Use labelIds to apply the user’s existing labels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: [...TASK_STATUSES] },
        priority: { type: 'string', enum: ['low', 'med', 'high'] },
        due: { type: 'string', description: 'YYYY-MM-DD' },
        labelIds: { type: 'array', items: { type: 'string' }, description: 'Existing label IDs to apply.' },
      },
      required: ['projectId', 'title'],
    },
  },
  {
    name: 'update_task',
    description: 'Update fields on an existing task (title, priority, due, description, status, labels). labelIds replaces the task’s labels.',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: [...TASK_STATUSES] },
        priority: { type: 'string', enum: ['low', 'med', 'high'] },
        due: { type: 'string', description: 'YYYY-MM-DD or empty string to clear' },
        description: { type: 'string' },
        labelIds: { type: 'array', items: { type: 'string' }, description: 'Existing label IDs to apply.' },
      },
      required: ['taskId'],
    },
  },
  {
    name: 'update_task_status',
    description: 'Update the status of an existing task',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: [...TASK_STATUSES] },
      },
      required: ['taskId', 'status'],
    },
  },
  {
    name: 'delete_task',
    description: 'Soft-delete a task by setting its status to canceled (recoverable — use restore_task to undo)',
    input_schema: {
      type: 'object' as const,
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'duplicate_task',
    description: 'Duplicate an existing task — creates a copy in the same column with "(copy)" appended to the title',
    input_schema: {
      type: 'object' as const,
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'restore_task',
    description: 'Restore a soft-deleted (canceled) task back to todo status',
    input_schema: {
      type: 'object' as const,
      properties: { taskId: { type: 'string' } },
      required: ['taskId'],
    },
  },
  {
    name: 'bulk_create_tasks',
    description: 'Create multiple tasks in a project at once from a list',
    input_schema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              status: { type: 'string' },
              priority: { type: 'string' },
              due: { type: 'string' },
            },
            required: ['title'],
          },
        },
      },
      required: ['projectId', 'tasks'],
    },
  },
  {
    name: 'bulk_update_task_status',
    description: 'Update the status of multiple tasks at once',
    input_schema: {
      type: 'object' as const,
      properties: {
        taskIds: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: [...TASK_STATUSES] },
      },
      required: ['taskIds', 'status'],
    },
  },
  {
    name: 'get_overdue_tasks',
    description: 'Return all tasks that have a due date in the past and are not done or canceled',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_tasks_by_status',
    description: 'Return tasks grouped by status (todo, in-progress, done, canceled), optionally filtered by project',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string', description: 'Optional project ID to filter by' } },
      required: [],
    },
  },
  {
    name: 'get_tasks_by_priority',
    description: 'Return tasks grouped by priority (low, med, high), optionally filtered by project',
    input_schema: {
      type: 'object' as const,
      properties: { projectId: { type: 'string', description: 'Optional project ID to filter by' } },
      required: [],
    },
  },
  {
    name: 'get_project_trash',
    description: 'List soft-deleted projects currently in trash (recoverable via restore_project)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'link_contact_to_project',
    description: 'Link a contact to an existing project — sets the project contactId so activity flows to their timeline',
    input_schema: {
      type: 'object' as const,
      properties: {
        contactId: { type: 'string' },
        projectId: { type: 'string' },
      },
      required: ['contactId', 'projectId'],
    },
  },
  {
    name: 'get_project_completion',
    description: 'Return completion percentage per project (done tasks / total tasks), along with total and done task counts',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_tasks_due_this_week',
    description: 'Return tasks due within the next 7 days that are not done or canceled',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
] as const

export const projectHandlers: Record<string, McpToolHandler> = {
  'get_projects': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    return limit === null
      ? queryProjects(userId, args.includeArchived === true)
      : queryProjectsBounded(userId, args.includeArchived === true, limit)
  },
  'get_project': async (userId, args, context) => {
    if (typeof args.projectId !== 'string') throw new Error('get_project requires projectId')
    const limit = externalListLimit(args, context)
    return limit === null
      ? getProject(userId, args.projectId)
      : getProjectBounded(userId, args.projectId, limit)
  },
  'create_project': async (userId, args) => {
    if (typeof args.name !== 'string') throw new Error('create_project requires name string')
    return mcpCreateProject(userId, {
      name: args.name,
      client: typeof args.client === 'string' ? args.client : undefined,
      color: typeof args.color === 'string' ? args.color : undefined,
      startDate: typeof args.startDate === 'string' ? args.startDate : undefined,
      dueDate: typeof args.dueDate === 'string' ? args.dueDate : undefined,
      description: typeof args.description === 'string' ? textToTiptapDoc(args.description) : undefined,
    })
  },
  'update_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('update_project requires projectId')
    return patchProject(userId, args.projectId, {
      name: typeof args.name === 'string' ? args.name : undefined,
      client: typeof args.client === 'string' ? args.client : undefined,
      startDate: typeof args.startDate === 'string' ? args.startDate : undefined,
      dueDate: typeof args.dueDate === 'string' ? args.dueDate : undefined,
      description: typeof args.description === 'string' ? textToTiptapDoc(args.description) : undefined,
      color: typeof args.color === 'string' ? args.color : undefined,
    })
  },
  'delete_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('delete_project requires projectId')
    const result = await softDeleteProject(userId, args.projectId)
    return result ?? { deleted: false, message: 'Project not found' }
  },
  'restore_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('restore_project requires projectId')
    const result = await restoreProject(userId, args.projectId)
    return result ?? { restored: false, message: 'Project not found' }
  },
  'duplicate_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('duplicate_project requires projectId')
    const copy = await duplicateProject(userId, args.projectId)
    return copy ?? { duplicated: false, message: 'Project not found' }
  },
  'archive_project': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('archive_project requires projectId')
    return archiveProject(userId, args.projectId)
  },
  'get_tasks': (userId, args, context) => {
    const limit = externalListLimit(args, context)
    const projectId = typeof args.projectId === 'string' ? args.projectId : undefined
    const filters = taskListFilters(args)
    return limit === null
      ? queryTasks(userId, projectId, args.includeArchived === true, filters)
      : queryTasksBounded(userId, projectId, args.includeArchived === true, limit, filters)
  },
  'create_task': async (userId, args) => {
    if (typeof args.projectId !== 'string' || typeof args.title !== 'string') {
      throw new Error('create_task requires projectId and title strings')
    }
    return mcpCreateTask(userId, {
      projectId: args.projectId,
      title: args.title,
      status: typeof args.status === 'string' ? args.status : undefined,
      priority: typeof args.priority === 'string' ? args.priority : undefined,
      due: typeof args.due === 'string' ? args.due : undefined,
      labelIds: optionalStringArray(args, 'labelIds'),
    })
  },
  'update_task': async (userId, args) => {
    if (typeof args.taskId !== 'string') throw new Error('update_task requires taskId')
    return patchTask(userId, args.taskId, {
      title: typeof args.title === 'string' ? args.title : undefined,
      status: typeof args.status === 'string' ? args.status : undefined,
      priority: typeof args.priority === 'string' ? args.priority : undefined,
      due: typeof args.due === 'string' ? args.due : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      labelIds: optionalStringArray(args, 'labelIds'),
    })
  },
  'update_task_status': async (userId, args) => {
    if (typeof args.taskId !== 'string' || typeof args.status !== 'string') {
      throw new Error('update_task_status requires taskId and status strings')
    }
    return updateTaskStatus(userId, args.taskId, args.status)
  },
  'delete_task': async (userId, args) => {
    if (typeof args.taskId !== 'string') throw new Error('delete_task requires taskId string')
    return archiveTask(userId, args.taskId)
  },
  'duplicate_task': async (userId, args) => {
    if (typeof args.taskId !== 'string') throw new Error('duplicate_task requires taskId string')
    const copy = await duplicateTask(userId, args.taskId)
    return copy ?? { duplicated: false, message: 'Task not found' }
  },
  'restore_task': async (userId, args) => {
    if (typeof args.taskId !== 'string') throw new Error('restore_task requires taskId string')
    const restored = await patchTask(userId, args.taskId, { status: 'todo' })
    return restored ?? { restored: false, message: 'Task not found' }
  },
  'bulk_create_tasks': async (userId, args) => {
    if (typeof args.projectId !== 'string') throw new Error('bulk_create_tasks requires projectId')
    if (!Array.isArray(args.tasks)) throw new Error('bulk_create_tasks requires tasks array')
    const created = []
    for (const t of args.tasks as Record<string, unknown>[]) {
      if (typeof t.title !== 'string') continue
      const task = await mcpCreateTask(userId, {
        projectId: args.projectId,
        title: t.title,
        status: typeof t.status === 'string' ? t.status : undefined,
        priority: typeof t.priority === 'string' ? t.priority : undefined,
        due: typeof t.due === 'string' ? t.due : undefined,
      })
      created.push(task)
    }
    return { created: created.length, tasks: created }
  },
  'bulk_update_task_status': async (userId, args) => {
    if (!Array.isArray(args.taskIds)) throw new Error('bulk_update_task_status requires taskIds array')
    if (typeof args.status !== 'string') throw new Error('bulk_update_task_status requires status')
    return bulkUpdateTaskStatus(userId, args.taskIds as string[], args.status)
  },
  'get_overdue_tasks': (userId) => getOverdueTasks(userId),
  'get_tasks_by_status': async (userId, args) => {
    return getTasksByStatus(userId, typeof args.projectId === 'string' ? args.projectId : undefined)
  },
  'get_tasks_by_priority': async (userId, args) => {
    return getTasksByPriority(userId, typeof args.projectId === 'string' ? args.projectId : undefined)
  },
  'get_project_trash': (userId) => listTrashedProjects(userId),
  'link_contact_to_project': async (userId, args) => {
    if (typeof args.contactId !== 'string') throw new Error('link_contact_to_project requires contactId')
    if (typeof args.projectId !== 'string') throw new Error('link_contact_to_project requires projectId')
    return linkContactToProject(userId, args.contactId, args.projectId)
  },
  'get_project_completion': (userId) => getProjectCompletion(userId),
  'get_tasks_due_this_week': (userId) => getTasksDueThisWeek(userId),
}
