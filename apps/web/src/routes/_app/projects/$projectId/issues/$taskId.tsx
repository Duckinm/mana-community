import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useProjects } from '@/context/projects'
import { useMilestones } from '@/hooks/use-milestones'
import { queryKeys } from '@/lib/query-keys'
import { TaskDetailPage } from '@/components/projects/task-detail-page'
import type { Task, TaskPatch } from '@/components/projects/types'

export const Route = createFileRoute('/_app/projects/$projectId/issues/$taskId')({
  component: TaskPage,
})

function TaskPage() {
  const { projectId, taskId } = Route.useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { projects, updateTask: apiUpdateTask, deleteTask: apiDeleteTask } = useProjects()
  const { milestones } = useMilestones(projectId)
  const project = projects.find((p) => p.id === projectId) ?? projects[0]

  let activeTask: Task | undefined
  let activeColumnLabel = ''
  for (const col of project?.columns ?? []) {
    const t = col.tasks.find((t) => t.id === taskId)
    if (t) {
      activeTask = t
      activeColumnLabel = col.label
      break
    }
  }

  const goBack = useCallback(() => {
    router.history.back()
  }, [router])

  const updateTask = useCallback(
    (patch: TaskPatch) => {
      if (!activeTask || !project) return
      apiUpdateTask(taskId, project.id, patch)
      if ('milestoneId' in patch || 'status' in patch) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(project.id) })
      }
    },
    [project, apiUpdateTask, taskId, activeTask, queryClient],
  )

  const deleteTask = useCallback(() => {
    if (!project) return
    apiDeleteTask(taskId, project.id)
  }, [project, apiDeleteTask, taskId])

  if (!project || !activeTask) {
    goBack()
    return null
  }

  return (
    <TaskDetailPage
      task={activeTask}
      projectName={project.name}
      columnLabel={activeColumnLabel}
      milestones={milestones}
      onBack={goBack}
      onUpdate={updateTask}
      onDelete={deleteTask}
    />
  )
}
