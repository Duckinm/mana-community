import { t } from 'elysia'
import { IsoInstant, NullableIsoInstant, NullableString, NotFoundResponse } from '@api/lib/wire-schema'
import { TaskPrioritySchema, TaskStatusSchema } from '@api/lib/wire-enums'
import { nullableTiptapDocSchema, tiptapDocSchema } from '@api/lib/rich-text'

const LabelSummary = t.Object({
  id: t.String(),
  name: t.String(),
  color: t.String(),
})

export const TaskResponse = t.Object({
  id: t.String(),
  projectId: t.String(),
  displayId: t.String(),
  title: t.String(),
  client: t.String(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  due: NullableString,
  dueTime: NullableString,
  scheduledStart: NullableIsoInstant,
  scheduledEnd: NullableIsoInstant,
  labels: t.Array(LabelSummary),
  aiAssigned: t.Optional(t.Boolean()),
  description: t.Optional(t.String()),
  body: t.Optional(tiptapDocSchema),
  milestoneId: t.Optional(t.Nullable(t.String())),
  createdAt: t.String(),
})

export const ColumnResponse = t.Object({
  id: t.String(),
  label: t.String(),
  tasks: t.Array(TaskResponse),
})

export const ProjectResponse = t.Object({
  id: t.String(),
  prefix: t.String(),
  name: t.String(),
  client: t.String(),
  color: t.String(),
  objective: t.String(),
  icon: t.String(),
  startDate: t.String(),
  dueDate: t.String(),
  description: nullableTiptapDocSchema,
  archived: t.Boolean(),
  labels: t.Array(LabelSummary),
  contactId: NullableString,
  contactName: t.String(),
  columns: t.Array(ColumnResponse),
  deletedAt: NullableIsoInstant,
})

export const ProjectsListResponse = t.Array(ProjectResponse)

export const MilestoneResponse = t.Object({
  id: t.String(),
  projectId: t.String(),
  name: t.String(),
  dueDate: t.String(),
  description: nullableTiptapDocSchema,
  status: t.String(),
  taskCount: t.Number(),
  doneCount: t.Number(),
  activeCount: t.Number(),
  completionPercent: t.Number(),
  createdAt: t.Optional(IsoInstant),
})

export const MilestonesListResponse = t.Array(MilestoneResponse)

export const CashflowChartPointResponse = t.Object({
  month: t.String(),
  idealSell: t.Number(),
  idealPurchase: t.Number(),
  current: t.Number(),
})

export const CashflowChartResponse = t.Array(CashflowChartPointResponse)

export { NotFoundResponse }
