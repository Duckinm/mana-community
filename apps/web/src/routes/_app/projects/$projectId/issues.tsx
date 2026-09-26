import { BoardTab } from '@/components/projects/board-tab'
import { TableTab } from '@/components/projects/table-tab'
import type { TaskFilter } from '@/components/projects/task-filter-matching'
import {
  getLastIssuesView,
  setLastIssuesView,
} from '@/components/shells/project-sub-nav'
import { useProjects } from '@/context/projects'
import { createFileRoute, Outlet, stripSearchParams, useMatches } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'

import { TASK_STATUSES } from '@mana/db/task-status'

const STATUS_VALUES = TASK_STATUSES
const PRIORITY_VALUES = ['high', 'med', 'low'] as const
const DUE_VALUES = ['overdue', 'today', 'week', 'month'] as const
const CREATED_VALUES = ['today', 'week', 'month'] as const
// Board/table view switching is available from tablet width up; phone
// (below md) is list-only — kanban at phone width is poor UX. See #24.
const TABLET_UP_MQ = '(min-width: 768px)'

const issuesSearchSchema = z.object({
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

type IssuesView = 'board' | 'table'

function useIsTabletUp() {
  const [isTabletUp, setIsTabletUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(TABLET_UP_MQ).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia(TABLET_UP_MQ)
    const onChange = () => setIsTabletUp(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return isTabletUp
}

export const Route = createFileRoute('/_app/projects/$projectId/issues')({
  validateSearch: issuesSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  component: IssuesLayout,
})

function IssuesLayout() {
  const { projectId } = Route.useParams()
  const { projects } = useProjects()
  const project = projects.find((p) => p.id === projectId) ?? projects[0]
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const isTabletUp = useIsTabletUp()

  const [view, setView] = useState<IssuesView>(() => getLastIssuesView(projectId))

  const matches = useMatches()
  const hasTaskOpen = matches.some((m) => 'taskId' in (m.params as Record<string, string>))

  const handleViewChange = useCallback(
    (next: IssuesView) => {
      setView(next)
      setLastIssuesView(projectId, next)
    },
    [projectId],
  )

  if (hasTaskOpen) return <Outlet />

  const filter: TaskFilter = {
    statuses: search.statuses,
    priorities: search.priorities,
    tags: search.tags,
    due: search.due,
    created: search.created,
    milestone: search.milestone,
  }

  function handleFilterChange(f: TaskFilter) {
    navigate({ search: () => f, resetScroll: false })
  }

  // Kanban is reachable from tablet width up; phone always uses list view.
  const effectiveView: IssuesView = isTabletUp ? view : 'table'

  return (
    <AnimatePresence mode="wait">
      {effectiveView === 'board' ? (
        <BoardTab
          key="board"
          project={project}
          filter={filter}
          onFilterChange={handleFilterChange}
          onViewChange={handleViewChange}
        />
      ) : (
        <TableTab
          key="table"
          project={project}
          filter={filter}
          onFilterChange={handleFilterChange}
          onViewChange={handleViewChange}
        />
      )}
    </AnimatePresence>
  )
}
