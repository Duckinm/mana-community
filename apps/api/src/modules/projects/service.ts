import type { Static } from 'elysia'
import { db } from '@api/db'
import { projects, tasks, milestones, labels, contacts, documents, TASK_STATUSES, TASK_STATUS_LABELS, DEFAULT_TASK_STATUS, parseTaskStatus } from '@mana/db'
import { parseTaskPriority, TASK_PRIORITIES, type TaskPriority } from '@api/lib/wire-enums'
import { eq, and, asc, isNull, isNotNull, lt, sql, inArray } from 'drizzle-orm'
import { logActivity, logProjectCreated, logProjectArchived, logProjectRestored, logTaskCompleted } from '@api/lib/activity'
import { activityScopeForProject } from '@api/lib/activity-helpers'
import { calendarDateFromTimestamp, parseCalendarDate, toCalendarDateString } from '@api/lib/calendar-date'
import { normalizeTiptapDoc } from '@api/lib/rich-text'
import { instantFieldToWire } from '@api/lib/wire-row'
import { createNotification } from '@api/modules/notifications/create'
import { assertProjectCreateAllowed } from '@api/modules/billing/entitlements'
import { NotFoundError, ValidationError } from '@api/lib/errors'
import type {
  CreateProjectBody,
  UpdateProjectBody,
  CreateTaskBody,
  UpdateTaskBody,
  CreateMilestoneBody,
  UpdateMilestoneBody,
} from '@api/modules/projects/model'

const COLUMN_IDS = TASK_STATUSES
const COLUMN_LABELS = TASK_STATUS_LABELS

function resolveLabels(labelIdsJson: string | null, allLabels: (typeof labels.$inferSelect)[]) {
  const labelIds = JSON.parse(labelIdsJson ?? '[]') as string[]
  const labelById = new Map(allLabels.map((l) => [l.id, l]))
  return labelIds
    .map((id) => labelById.get(id))
    .filter((l): l is typeof labels.$inferSelect => l != null)
    .map((l) => ({ id: l.id, name: l.name, color: l.color }))
}

function canonicalTaskTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) throw new ValidationError('Task title is required')
  return trimmed
}

function canonicalTaskPriority(priority: string): TaskPriority {
  if (!(TASK_PRIORITIES as readonly string[]).includes(priority)) {
    throw new ValidationError('priority must be one of high, med, low')
  }
  return priority as TaskPriority
}

export function parseTaskScheduledSpan(values: {
  scheduledStart?: string | null
  scheduledEnd?: string | null
}): { start: Date | null; end: Date | null } | null {
  const hasStart = values.scheduledStart !== undefined
  const hasEnd = values.scheduledEnd !== undefined
  if (hasStart !== hasEnd) {
    throw new ValidationError('scheduledStart and scheduledEnd must be supplied together')
  }
  if (!hasStart) return null
  if (values.scheduledStart === null && values.scheduledEnd === null) {
    return { start: null, end: null }
  }
  if (values.scheduledStart === null || values.scheduledEnd === null) {
    throw new ValidationError('scheduledStart and scheduledEnd must both be null or ISO timestamps')
  }

  const scheduledStart = values.scheduledStart
  const scheduledEnd = values.scheduledEnd
  if (scheduledStart === undefined || scheduledEnd === undefined) {
    throw new ValidationError('scheduledStart and scheduledEnd must be supplied together')
  }
  const start = new Date(scheduledStart)
  const end = new Date(scheduledEnd)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ValidationError('scheduledStart and scheduledEnd must be valid ISO timestamps')
  }
  if (end.getTime() <= start.getTime()) {
    throw new ValidationError('scheduledEnd must be after scheduledStart')
  }
  return { start, end }
}

async function resolveOwnedLabelIds(userId: string, labelIds: string[]): Promise<string[]> {
  if (!Array.isArray(labelIds) || labelIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw new ValidationError('labelIds must be an array of label IDs')
  }
  const uniqueIds = [...new Set(labelIds)]
  if (uniqueIds.length === 0) return []

  const owned = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.userId, userId), inArray(labels.id, uniqueIds)))
  if (owned.length !== uniqueIds.length) {
    throw new ValidationError('Every label must belong to you')
  }
  return uniqueIds
}

export function taskRowToClientDto(
  t: typeof tasks.$inferSelect,
  projectClient: string,
  allLabels: (typeof labels.$inferSelect)[] = [],
  projectPrefix = '',
) {
  return {
    id: t.id,
    projectId: t.projectId,
    displayId: `${projectPrefix}-${t.number}`,
    title: t.title,
    client: projectClient,
    status: parseTaskStatus(t.status),
    priority: parseTaskPriority(t.priority),
    due: t.due == null ? null : String(t.due),
    dueTime: t.dueTime ?? null,
    scheduledStart: instantFieldToWire(t.scheduledStart),
    scheduledEnd: instantFieldToWire(t.scheduledEnd),
    labels: resolveLabels(t.labelIds, allLabels),
    aiAssigned: t.aiAssigned ?? false,
    description: t.description ?? undefined,
    body: t.body ?? undefined,
    milestoneId: t.milestoneId ?? null,
    createdAt: calendarDateFromTimestamp(t.createdAt),
  }
}

export function buildProject(
  project: typeof projects.$inferSelect,
  projectTasks: (typeof tasks.$inferSelect)[],
  allLabels: (typeof labels.$inferSelect)[] = [],
  contactName = '',
) {
  const columns = COLUMN_IDS.map((colId) => ({
    id: colId,
    label: COLUMN_LABELS[colId],
    tasks: projectTasks
      .filter((t) => t.status === colId)
      .sort((a, b) => a.position - b.position)
      .map((t) => taskRowToClientDto(t, project.client, allLabels, project.prefix)),
  }))

  const projectLabels = resolveLabels(project.labelIds, allLabels)

  return {
    id: project.id,
    prefix: project.prefix,
    name: project.name,
    client: project.client,
    color: project.color,
    objective: project.objective ?? '',
    icon: project.icon ?? '',
    startDate: project.startDate ?? '',
    dueDate: project.dueDate ?? '',
    description: project.description,
    archived: project.archived,
    labels: projectLabels,
    contactId: project.contactId ?? null,
    contactName,
    columns,
    deletedAt: instantFieldToWire(project.deletedAt),
  }
}

async function contactNameMap(userId: string) {
  const rows = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(eq(contacts.userId, userId))
  return new Map(rows.map((c) => [c.id, c.name]))
}

function contactNameFor(project: typeof projects.$inferSelect, names: Map<string, string>) {
  return project.contactId ? (names.get(project.contactId) ?? '') : ''
}

// Derives a short uppercase task-ID prefix from a project name, e.g. "Acme Rebrand" -> "ACM"
function prefixFromName(name: string) {
  const letters = name.toUpperCase().replace(/[^A-Z]/g, '')
  return letters.slice(0, 3) || 'TSK'
}

async function uniquePrefix(userId: string, name: string) {
  const base = prefixFromName(name)
  const existing = await db
    .select({ prefix: projects.prefix })
    .from(projects)
    .where(eq(projects.userId, userId))
  const taken = new Set(existing.map((p) => p.prefix))
  if (!taken.has(base)) return base
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}${i}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}${crypto.randomUUID().slice(0, 4).toUpperCase()}`
}

export async function listProjects(userId: string) {
  const [userProjects, userTasks, userLabels, names] = await Promise.all([
    db.select().from(projects).where(and(eq(projects.userId, userId), isNull(projects.deletedAt))),
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.position)),
    db.select().from(labels).where(eq(labels.userId, userId)),
    contactNameMap(userId),
  ])

  return userProjects.map((p) =>
    buildProject(
      p,
      userTasks.filter((t) => t.projectId === p.id),
      userLabels,
      contactNameFor(p, names),
    ),
  )
}

export async function createProject(
  userId: string,
  body: Static<typeof CreateProjectBody>,
) {
  await assertProjectCreateAllowed(userId)
  const prefix = await uniquePrefix(userId, body.name)
  const [project] = await db.insert(projects).values({
    userId,
    name: body.name,
    prefix,
    client: body.client ?? body.name,
    color: body.color ?? '#D4A843',
    objective: body.objective ?? '',
    icon: body.icon ?? '',
    startDate: body.startDate ?? '',
    dueDate: body.dueDate ?? '',
    description: normalizeTiptapDoc(body.description),
    labelIds: JSON.stringify(body.labelIds ?? []),
    contactId: body.contactId ?? null,
  }).returning()
  logProjectCreated(project, userId)
  const names = await contactNameMap(userId)
  return buildProject(project, [], [], contactNameFor(project, names))
}

export async function patchProject(
  userId: string,
  projectId: string,
  body: Static<typeof UpdateProjectBody>,
) {
  const patch: Partial<typeof projects.$inferInsert> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.client !== undefined) patch.client = body.client
  if (body.color !== undefined) patch.color = body.color
  if (body.objective !== undefined) patch.objective = body.objective
  if (body.icon !== undefined) patch.icon = body.icon
  if (body.startDate !== undefined) patch.startDate = body.startDate
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate
  if (body.description !== undefined) patch.description = normalizeTiptapDoc(body.description)
  if (body.archived !== undefined) patch.archived = body.archived
  if (body.archived === false) patch.planArchivedAt = null
  if (body.labelIds !== undefined) patch.labelIds = JSON.stringify(body.labelIds)
  if (body.contactId !== undefined) patch.contactId = body.contactId
  patch.updatedAt = new Date()

  if (body.archived === false) {
    const [existing] = await db
      .select({ archived: projects.archived })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    if (existing?.archived) await assertProjectCreateAllowed(userId)
  }

  const [updated] = await db
    .update(projects)
    .set(patch)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()

  if (!updated) return null

  const [projectTasks, userLabels, names] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.position)),
    db.select().from(labels).where(eq(labels.userId, userId)),
    contactNameMap(userId),
  ])

  return buildProject(updated, projectTasks, userLabels, contactNameFor(updated, names))
}

export async function softDeleteProject(userId: string, projectId: string) {
  const [updated] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()
  if (updated) {
    logProjectArchived(updated, userId)
  }
  return updated ? buildProject(updated, [], [], '') : null
}

export async function restoreProject(userId: string, projectId: string) {
  await assertProjectCreateAllowed(userId)
  const [updated] = await db
    .update(projects)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()
  if (!updated) return null
  logProjectRestored(updated, userId)
  const [projectTasks, userLabels, names] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.position)),
    db.select().from(labels).where(eq(labels.userId, userId)),
    contactNameMap(userId),
  ])
  return buildProject(updated, projectTasks, userLabels, contactNameFor(updated, names))
}

export async function listTrashedProjects(userId: string) {
  const deleted = await db
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), isNotNull(projects.deletedAt)))
  return deleted.map((p) => buildProject(p, [], [], ''))
}

export async function duplicateProject(userId: string, projectId: string) {
  const [original] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  if (!original) return null
  await assertProjectCreateAllowed(userId)
  const prefix = await uniquePrefix(userId, `${original.name} copy`)
  const [copy] = await db.insert(projects).values({
    userId,
    name: `${original.name} (copy)`,
    prefix,
    client: original.client,
    color: original.color,
    objective: original.objective ?? '',
    icon: original.icon ?? '',
    startDate: original.startDate ?? '',
    dueDate: original.dueDate ?? '',
    description: original.description,
    archived: false,
    labelIds: original.labelIds ?? '[]',
    contactId: original.contactId ?? null,
  }).returning()
  const [userLabels, names] = await Promise.all([
    db.select().from(labels).where(eq(labels.userId, userId)),
    contactNameMap(userId),
  ])
  return buildProject(copy, [], userLabels, contactNameFor(copy, names))
}

export async function purgeOldTrash() {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const result = await db
    .delete(projects)
    .where(and(isNotNull(projects.deletedAt), lt(projects.deletedAt, cutoff)))
    .returning({ id: projects.id })
  return result.length
}

export async function createTask(
  userId: string,
  projectId: string,
  body: Static<typeof CreateTaskBody>,
) {
  const status = body.status ? parseTaskStatus(body.status) : DEFAULT_TASK_STATUS
  const title = canonicalTaskTitle(body.title)
  const priority = body.priority === undefined ? 'med' : canonicalTaskPriority(body.priority)
  const scheduledSpan = parseTaskScheduledSpan(body)
  const labelIds = await resolveOwnedLabelIds(userId, body.labelIds ?? [])
  const existing = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, status)))

  const maxPos = existing.reduce((m, t) => Math.max(m, t.position), -1)

  const [project] = await db
    .update(projects)
    .set({ taskCounter: sql`${projects.taskCounter} + 1` })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .returning()
  if (!project) throw new NotFoundError('Project not found')

  const [task] = await db.insert(tasks).values({
    projectId,
    userId,
    number: project.taskCounter,
    title,
    status,
    priority,
    due: body.due ?? null,
    dueTime: body.dueTime ?? null,
    scheduledStart: scheduledSpan?.start ?? null,
    scheduledEnd: scheduledSpan?.end ?? null,
    labelIds: JSON.stringify(labelIds),
    aiAssigned: body.aiAssigned ?? false,
    description: body.description ?? null,
    body: normalizeTiptapDoc(body.body),
    milestoneId: body.milestoneId ?? null,
    position: maxPos + 1,
  }).returning()

  const userLabels = await db.select().from(labels).where(eq(labels.userId, userId))

  const scope = await activityScopeForProject(userId, projectId)
  logActivity({
    userId,
    entityType: 'task',
    entityId: task.id,
    action: 'created',
    summaryKey: 'activity:task.created',
    summaryParams: { title },
    projectId: scope.projectId,
    contactId: scope.contactId,
  })
  return taskRowToClientDto(task, project.client, userLabels, project.prefix)
}

export async function patchTask(
  userId: string,
  taskId: string,
  body: Static<typeof UpdateTaskBody>,
) {
  const patch: Partial<typeof tasks.$inferInsert> = {}
  const scheduledSpan = parseTaskScheduledSpan(body)
  if (body.title !== undefined) patch.title = canonicalTaskTitle(body.title)
  if (body.status !== undefined) patch.status = parseTaskStatus(body.status)
  if (body.priority !== undefined) patch.priority = canonicalTaskPriority(body.priority)
  if (body.due !== undefined) patch.due = body.due
  if (body.dueTime !== undefined) patch.dueTime = body.dueTime
  if (scheduledSpan) {
    patch.scheduledStart = scheduledSpan.start
    patch.scheduledEnd = scheduledSpan.end
  }
  if (body.labelIds !== undefined) patch.labelIds = JSON.stringify(await resolveOwnedLabelIds(userId, body.labelIds))
  if (body.aiAssigned !== undefined) patch.aiAssigned = body.aiAssigned
  if (body.description !== undefined) patch.description = body.description
  if (body.body !== undefined) patch.body = normalizeTiptapDoc(body.body)
  if (body.position !== undefined) patch.position = body.position
  if (body.milestoneId !== undefined) patch.milestoneId = body.milestoneId
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(tasks)
    .set(patch)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning()

  if (!updated) return null

  if (body.status === 'done') {
    const scope = await activityScopeForProject(userId, updated.projectId)
    logTaskCompleted({ id: taskId, title: updated.title, projectId: updated.projectId }, userId, scope)
  }

  const [project] = await db
    .select({ client: projects.client, prefix: projects.prefix })
    .from(projects)
    .where(eq(projects.id, updated.projectId))

  const userLabels = await db.select().from(labels).where(eq(labels.userId, userId))

  return taskRowToClientDto(updated, project?.client ?? '', userLabels, project?.prefix)
}

export async function duplicateTask(userId: string, taskId: string) {
  const [original] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
  if (!original) return null

  const existing = await db
    .select({ position: tasks.position })
    .from(tasks)
    .where(and(eq(tasks.projectId, original.projectId), eq(tasks.status, original.status)))
  const maxPos = existing.reduce((m, t) => Math.max(m, t.position), -1)

  const [project] = await db
    .update(projects)
    .set({ taskCounter: sql`${projects.taskCounter} + 1` })
    .where(eq(projects.id, original.projectId))
    .returning()

  const [copy] = await db.insert(tasks).values({
    projectId: original.projectId,
    userId,
    number: project.taskCounter,
    title: `${original.title} (copy)`,
    status: original.status,
    priority: original.priority,
    due: original.due ?? null,
    dueTime: original.dueTime ?? null,
    scheduledStart: original.scheduledStart,
    scheduledEnd: original.scheduledEnd,
    labelIds: original.labelIds ?? '[]',
    aiAssigned: false,
    description: original.description ?? null,
    position: maxPos + 1,
  }).returning()

  const userLabels = await db.select().from(labels).where(eq(labels.userId, userId))
  return taskRowToClientDto(copy, project?.client ?? '', userLabels, project?.prefix)
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const [existing] = await db
    .select({ projectId: tasks.projectId, title: tasks.title })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1)

  if (!existing) return false

  await db.delete(tasks).where(
    and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
  )

  const scope = await activityScopeForProject(userId, existing.projectId)
  logActivity({
    userId,
    entityType: 'task',
    entityId: taskId,
    action: 'deleted',
    summaryKey: 'activity:task.deleted',
    summaryParams: { title: existing.title },
    projectId: scope.projectId,
    contactId: scope.contactId,
  })
  return true
}

function buildMilestone(
  milestone: typeof milestones.$inferSelect,
  linkedTasks: { status: string }[],
) {
  const taskCount = linkedTasks.length
  const doneCount = linkedTasks.filter((t) => t.status === 'done').length
  const activeCount = linkedTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in-progress',
  ).length
  return {
    id: milestone.id,
    projectId: milestone.projectId,
    name: milestone.name,
    dueDate: milestone.dueDate ?? '',
    description: milestone.description,
    status: milestone.status,
    taskCount,
    doneCount,
    activeCount,
    completionPercent: taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100),
    createdAt: calendarDateFromTimestamp(milestone.createdAt),
  }
}

export async function listMilestones(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.userId, userId), eq(milestones.projectId, projectId)))
    .orderBy(asc(milestones.createdAt))

  const linkedTasks = await db
    .select({ milestoneId: tasks.milestoneId, status: tasks.status })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))

  return rows.map((m) =>
    buildMilestone(m, linkedTasks.filter((t) => t.milestoneId === m.id)),
  )
}

async function milestoneWithCompletion(userId: string, milestoneId: string) {
  const [milestone] = await db
    .select()
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, userId)))
  if (!milestone) return null

  const linkedTasks = await db
    .select({ status: tasks.status })
    .from(tasks)
    .where(eq(tasks.milestoneId, milestoneId))

  return buildMilestone(milestone, linkedTasks)
}

export async function createMilestone(
  userId: string,
  projectId: string,
  body: Static<typeof CreateMilestoneBody>,
) {
  const [milestone] = await db.insert(milestones).values({
    userId,
    projectId,
    name: body.name,
    dueDate: body.dueDate ?? '',
    description: normalizeTiptapDoc(body.description),
    status: body.status ?? 'pending',
  }).returning()
  return buildMilestone(milestone, [])
}

export async function patchMilestone(
  userId: string,
  milestoneId: string,
  body: Static<typeof UpdateMilestoneBody>,
) {
  const [existing] = await db
    .select({ status: milestones.status, name: milestones.name })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, userId)))
  if (!existing) return null

  const patch: Partial<typeof milestones.$inferInsert> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate
  if (body.description !== undefined) patch.description = normalizeTiptapDoc(body.description)
  if (body.status !== undefined) patch.status = body.status
  patch.updatedAt = new Date()

  const [updated] = await db
    .update(milestones)
    .set(patch)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, userId)))
    .returning()
  if (!updated) return null

  if (body.status !== undefined && body.status !== existing.status) {
    await createNotification({
      userId,
      title: 'Milestone status changed',
      body: `${updated.name} is now ${updated.status}.`,
      key: 'milestoneStatus',
      params: { name: updated.name, status: updated.status },
      link: `/projects/${updated.projectId}/overview`,
    })
  }

  return milestoneWithCompletion(userId, updated.id)
}

export async function deleteMilestone(userId: string, milestoneId: string) {
  const [deleted] = await db
    .delete(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.userId, userId)))
    .returning({ id: milestones.id })
  return deleted ?? null
}

const PURCHASE_COST_RATIO = 0.35

export interface CashflowChartPoint {
  month: string
  idealSell: number
  idealPurchase: number
  current: number
}

function monthKey(date: string): string {
  const parsed = parseCalendarDate(date)
  if (!parsed) return date.slice(0, 7)
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(
    new Date(y, m - 1, 1),
  )
}

type CashflowDoc = {
  type: string
  status: string
  amountDueCents: number
  issueDate: string | null
  dueDate: string | null
  paidAt: string | null
}

function buildMonthRange(docs: CashflowDoc[], projectStart: string, projectDue: string): string[] {
  const dates: string[] = []
  if (projectStart) dates.push(projectStart)
  if (projectDue) dates.push(projectDue)
  for (const doc of docs) {
    if (doc.issueDate) dates.push(doc.issueDate)
    if (doc.dueDate) dates.push(doc.dueDate)
    if (doc.paidAt) dates.push(doc.paidAt.slice(0, 10))
  }

  const today = toCalendarDateString(new Date())
  dates.push(today)

  const keys = [...new Set(dates.map(monthKey))].sort()
  if (keys.length === 0) {
    return [monthKey(today)]
  }

  const start = keys[0]!
  const end = keys[keys.length - 1]!
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  const months: string[] = []
  let y = sy!
  let m = sm!
  while (y < ey! || (y === ey! && m <= em!)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return months
}

function addToMonth(map: Map<string, number>, date: string | null | undefined, cents: number) {
  if (!date || cents <= 0) return
  const key = monthKey(date)
  map.set(key, (map.get(key) ?? 0) + cents)
}

export async function getProjectCashflow(
  userId: string,
  projectId: string,
): Promise<CashflowChartPoint[] | null> {
  const [project] = await db
    .select({ startDate: projects.startDate, dueDate: projects.dueDate })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  if (!project) return null

  const docs = await db
    .select({
      type: documents.type,
      status: documents.status,
      amountDueCents: documents.amountDueCents,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      paidAt: documents.paidAt,
    })
    .from(documents)
    .where(and(
      eq(documents.userId, userId),
      eq(documents.projectId, projectId),
      isNull(documents.deletedAt),
      sql`${documents.status} != 'draft'`,
    ))

  const months = buildMonthRange(docs, project.startDate ?? '', project.dueDate ?? '')

  const sellByMonth = new Map<string, number>()
  const purchaseByMonth = new Map<string, number>()
  const currentByMonth = new Map<string, number>()

  for (const doc of docs) {
    if (doc.type === 'QO' || doc.type === 'INV') {
      const scheduleDate = doc.dueDate ?? doc.issueDate
      addToMonth(sellByMonth, scheduleDate, doc.amountDueCents)
      addToMonth(purchaseByMonth, scheduleDate, Math.round(doc.amountDueCents * PURCHASE_COST_RATIO))
    }

    if (doc.type === 'INV' && doc.paidAt) {
      addToMonth(currentByMonth, doc.paidAt.slice(0, 10), doc.amountDueCents)
    }
    if (doc.type === 'RC') {
      addToMonth(currentByMonth, doc.issueDate ?? doc.dueDate, doc.amountDueCents)
    }
  }

  let idealSell = 0
  let idealPurchase = 0
  let current = 0

  return months.map((key) => {
    idealSell += sellByMonth.get(key) ?? 0
    idealPurchase += purchaseByMonth.get(key) ?? 0
    current += currentByMonth.get(key) ?? 0
    return { month: monthLabel(key), idealSell, idealPurchase, current }
  })
}

export async function reorderColumns(
  userId: string,
  columns: Record<string, string[]>,
) {
  const updates: Promise<unknown>[] = []
  for (const [colId, taskIds] of Object.entries(columns)) {
    const status = parseTaskStatus(colId)
    ;(taskIds as string[]).forEach((taskId, idx) => {
      updates.push(
        db
          .update(tasks)
          .set({ status, position: idx, updatedAt: new Date() })
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId))),
      )
    })
  }
  await Promise.all(updates)
}
