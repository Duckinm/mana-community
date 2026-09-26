import { setLastIssuesView } from '@/components/shells/project-sub-nav'
import { createFileRoute, Outlet, redirect, stripSearchParams } from '@tanstack/react-router'
import { z } from 'zod'

import { TASK_STATUSES } from '@mana/db/task-status'

const STATUS_VALUES = TASK_STATUSES
const PRIORITY_VALUES = ['high', 'med', 'low'] as const
const DUE_VALUES = ['overdue', 'today', 'week', 'month'] as const
const CREATED_VALUES = ['today', 'week', 'month'] as const

const boardSearchSchema = z.object({
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

export const Route = createFileRoute('/_app/projects/$projectId/board')({
  validateSearch: boardSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  beforeLoad: ({ location, params, search }) => {
    const taskMatch = location.pathname.match(/\/board\/([^/]+)$/)
    if (taskMatch) return

    setLastIssuesView(params.projectId, 'board')
    throw redirect({
      to: '/projects/$projectId/issues',
      params: { projectId: params.projectId },
      search,
    })
  },
  component: () => <Outlet />,
})
