import { setLastIssuesView } from '@/components/shells/project-sub-nav'
import { createFileRoute, redirect, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { TASK_STATUSES } from '@mana/db/task-status'

const STATUS_VALUES = TASK_STATUSES
const PRIORITY_VALUES = ['high', 'med', 'low'] as const
const DUE_VALUES = ['overdue', 'today', 'week', 'month'] as const
const CREATED_VALUES = ['today', 'week', 'month'] as const

const tableSearchSchema = z.object({
  statuses: z.array(z.enum(STATUS_VALUES)).catch([]),
  priorities: z.array(z.enum(PRIORITY_VALUES)).catch([]),
  tags: z.array(z.string()).catch([]),
  due: z.enum(DUE_VALUES).nullable().catch(null),
  created: z.enum(CREATED_VALUES).nullable().catch(null),
  milestone: z.string().nullable().catch(null),
})

const searchDefaults = {
  statuses: [],
  priorities: [],
  tags: [],
  due: null,
  created: null,
  milestone: null,
}

export const Route = createFileRoute('/_app/projects/$projectId/table')({
  validateSearch: tableSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  beforeLoad: ({ params, search }) => {
    setLastIssuesView(params.projectId, 'table')
    throw redirect({
      to: '/projects/$projectId/issues',
      params: { projectId: params.projectId },
      search,
    })
  },
})
