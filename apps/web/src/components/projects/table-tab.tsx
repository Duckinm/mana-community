import { CreateTaskDialog } from '@/components/projects/create-task-dialog'
import { FilterBar } from '@/components/projects/filter-bar'
import { IssuesViewSwitcher } from '@/components/projects/issues-view-switcher'
import { TaskDeleteConfirmDialog } from '@/components/projects/task-delete-confirm-dialog'
import { TaskTableList } from '@/components/projects/task-table-list'
import {
  applyFilter,
  isFilterActive,
} from '@/components/projects/task-filter-matching'
import type { TaskFilter } from '@/components/projects/task-filter-matching'
import type { ApiTaskPatchBody } from '@/lib/api-types'
import type { Project, Status, Task } from '@/components/projects/types'
import { useMilestones } from '@/hooks/use-milestones'
import { useProjects } from '@/context/projects'
import { panelFadeUp } from '@/lib/motion'
import type { UniqueIdentifier } from '@dnd-kit/core'
import { useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function TableTab({
  project,
  filter,
  onFilterChange,
  onViewChange,
}: {
  project: Project
  filter: TaskFilter
  onFilterChange: (f: TaskFilter) => void
  onViewChange: (view: 'board' | 'table') => void
}) {
  const { t } = useTranslation('projects')
  const navigate = useNavigate()
  const { projects, updateTask: apiUpdateTask, deleteTask: apiDeleteTask, duplicateTask: apiDuplicateTask, createTask: apiCreateTask, reorderColumns } = useProjects()
  const { milestones } = useMilestones(project.id)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [createForStatus, setCreateForStatus] = useState<Status | null>(null)

  const statusOrder = useMemo(
    () => project.columns.map((col) => col.id as Status),
    [project.columns],
  )

  const allTasks = useMemo(
    () => project.columns.flatMap((c) => c.tasks),
    [project.columns],
  )

  const columnsMap = useMemo<Record<UniqueIdentifier, Task[]>>(
    () => Object.fromEntries(project.columns.map((col) => [col.id, col.tasks])),
    [project.columns],
  )

  const filtered = useMemo(() => applyFilter(allTasks, filter), [allTasks, filter])

  const otherProjects = useMemo(
    () => projects.filter((p) => p.id !== project.id).map((p) => ({ id: p.id, name: p.name })),
    [projects, project.id],
  )

  const handleMoveTask = useCallback(
    async (taskId: string, targetProjectId: string) => {
      const task = allTasks.find((t) => t.id === taskId)
      if (!task) return
      await apiCreateTask(targetProjectId, task.status, {
        title: task.title,
        priority: task.priority,
        due: task.due,
        labelIds: task.labels.map((l) => l.id),
        description: task.description,
        aiAssigned: false,
      })
      await apiDeleteTask(taskId, project.id)
    },
    [allTasks, apiCreateTask, apiDeleteTask, project.id],
  )

  function updateTask(taskId: string, patch: ApiTaskPatchBody) {
    apiUpdateTask(taskId, project.id, patch)
  }

  function deleteTask(taskId: string) {
    apiDeleteTask(taskId, project.id)
  }

  function handleReorderTasks(updated: Record<UniqueIdentifier, Task[]>) {
    reorderColumns(project.id, updated)
  }

  return (
    <motion.div
      key="table"
      {...panelFadeUp}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 xl:mb-5">
        <div className="min-w-0 flex-1">
          <FilterBar filter={filter} onChange={onFilterChange} />
        </div>
        <IssuesViewSwitcher current="table" onViewChange={onViewChange} />
      </div>

      <TaskTableList
        tasks={filtered}
        milestones={milestones}
        statusOrder={statusOrder}
        projectId={project.id}
        otherProjects={otherProjects}
        filterActive={isFilterActive(filter)}
        emptyMessage={t('table.noTasks')}
        onCreateTask={(status) => setCreateForStatus(status)}
        onMoveTask={handleMoveTask}
        onReorderTasks={handleReorderTasks}
        columnsMap={columnsMap}
        onRowClick={(task) =>
          navigate({
            to: '/projects/$projectId/issues/$taskId',
            params: { projectId: project.id, taskId: task.id },
            search: { statuses: [], priorities: [], tags: [], due: null, created: null, milestone: null },
          })
        }
        onUpdateTask={updateTask}
        onDeleteTask={setPendingDeleteId}
        onDuplicateTask={(taskId) => apiDuplicateTask(taskId, project.id)}
      />

      <AnimatePresence>
        {createForStatus && (
          <CreateTaskDialog
            key={createForStatus}
            defaultColumnId={createForStatus}
            onClose={() => setCreateForStatus(null)}
            onCreate={(colId, task) => {
              apiCreateTask(project.id, colId, task)
              setCreateForStatus(null)
            }}
          />
        )}
      </AnimatePresence>

      <TaskDeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        taskTitle={filtered.find((task) => task.id === pendingDeleteId)?.title}
        onConfirm={() => {
          if (pendingDeleteId) deleteTask(pendingDeleteId)
        }}
      />
    </motion.div>
  )
}
