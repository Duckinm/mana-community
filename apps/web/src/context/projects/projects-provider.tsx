import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18next from '@/lib/i18n'
import { queryKeys } from '@/lib/query-keys'
import { client, expectEden, expectEdenVoid } from '@/lib/eden'
import { invalidateProjects } from '@/lib/invalidate-helpers'
import { makeOptimisticMutation } from '@/lib/optimistic-mutation'
import type { ApiProjectCreateBody, ApiTaskCreateBody, ApiTaskPatchBody } from '@/lib/api-types'
import type { Project, Status, Task } from '@/components/projects/types'
import type { UniqueIdentifier } from '@dnd-kit/core'
import {
  addTask as cacheAddTask,
  updateTask as cacheUpdateTask,
  removeTask as cacheRemoveTask,
  reorderColumns as cacheReorderColumns,
} from '@/context/projects/project-cache'

export interface ProjectsContextValue {
  projects: Project[]
  trashedProjects: Project[]
  loading: boolean
  isError: boolean
  refetch: () => void
  addProject: (project: ApiProjectCreateBody) => Promise<Project>
  updateProject: (patch: Partial<Project> & { id: string }) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  restoreProject: (id: string) => Promise<void>
  duplicateProject: (id: string) => Promise<Project>
  createTask: (projectId: string, columnId: Status, task: ApiTaskCreateBody) => Promise<Task>
  updateTask: (taskId: string, projectId: string, patch: ApiTaskPatchBody) => Promise<void>
  deleteTask: (taskId: string, projectId: string) => Promise<void>
  duplicateTask: (taskId: string, projectId: string) => Promise<Task>
  reorderColumns: (projectId: string, columns: Record<UniqueIdentifier, Task[]>) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function useProjects() {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects must be used within ProjectsProvider')
  return ctx
}

function useProjectsContextValue(): ProjectsContextValue {
  const queryClient = useQueryClient()

  const { data: projects = [], isPending: projectsPending, isError: projectsError, refetch: refetchProjectsQuery } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => expectEden(await client.api.projects.get()),
  })

  const { data: trashedProjects = [] } = useQuery({
    queryKey: queryKeys.trashedProjects,
    queryFn: async () => expectEden(await client.api.projects.trash.get()),
  })

  const loading = projectsPending
  const isError = projectsError

  const refetch = () => {
    void invalidateProjects(queryClient)
    void refetchProjectsQuery()
  }

  const addProjectMutation = useMutation({
    mutationFn: async (project: ApiProjectCreateBody) =>
      expectEden(await client.api.projects.post(project)),
    onSuccess: () => { void invalidateProjects(queryClient) },
    onError: (_error, project) => {
      toast.error(i18next.t('toast.createProjectFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => addProjectMutation.mutate(project) },
      })
    },
  })

  const updateProjectMutation = useMutation(
    makeOptimisticMutation<Project, Error, Partial<Project> & { id: string }>(queryClient, queryKeys.projects, {
      mutationFn: async (patch) => {
        const { id, ...rest } = patch
        return expectEden(await client.api.projects({ id }).patch(rest))
      },
      optimisticUpdate: (prev, patch) => prev.map((p) => (p.id === patch.id ? { ...p, ...patch } : p)),
      onError: (_err, patch) => toast.error(i18next.t('toast.saveProjectFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateProjectMutation.mutate(patch) },
      }),
    }),
  )

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => expectEden(await client.api.projects({ id }).delete()),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects })
      const previous = queryClient.getQueryData<Project[]>(queryKeys.projects)
      queryClient.setQueryData<Project[]>(queryKeys.projects, (prev = []) => prev.filter((p) => p.id !== id))
      return { previous }
    },
    onError: (_err, id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.projects, ctx.previous)
      toast.error(i18next.t('toast.deleteProjectFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteProjectMutation.mutate(id) },
      })
    },
    onSuccess: (deleted) => {
      queryClient.setQueryData<Project[]>(queryKeys.trashedProjects, (prev = []) => [...prev, deleted])
      void invalidateProjects(queryClient)
    },
  })

  const restoreProjectMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEden(await client.api.projects({ id }).restore.post({})),
    onSuccess: (restored) => {
      queryClient.setQueryData<Project[]>(queryKeys.trashedProjects, (prev = []) => prev.filter((p) => p.id !== restored.id))
      queryClient.setQueryData<Project[]>(queryKeys.projects, (prev = []) => [...prev, restored])
    },
    onError: (_error, id) => {
      toast.error(i18next.t('toast.restoreProjectFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => restoreProjectMutation.mutate(id) },
      })
    },
  })

  const duplicateProjectMutation = useMutation({
    mutationFn: async (id: string) =>
      expectEden(await client.api.projects({ id }).duplicate.post({})),
    onSuccess: (copy) => {
      queryClient.setQueryData<Project[]>(queryKeys.projects, (prev = []) => [...prev, copy])
    },
    onError: (_error, id) => {
      toast.error(i18next.t('toast.duplicateProjectFailed', { ns: 'projects' }), {
        action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => duplicateProjectMutation.mutate(id) },
      })
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: async ({ projectId, columnId, task }: { projectId: string; columnId: Status; task: ApiTaskCreateBody }) =>
      expectEden(
        await client.api.projects({ id: projectId }).tasks.post({ ...task, status: columnId }),
      ),
    onSuccess: (created, { projectId, columnId }) => {
      queryClient.setQueryData<Project[]>(queryKeys.projects, (prev = []) =>
        cacheAddTask(prev, projectId, columnId, created),
      )
      if (created.milestoneId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) })
      }
    },
    onError: (_err, vars) => toast.error(i18next.t('toast.createTaskFailed', { ns: 'projects' }), {
      action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => createTaskMutation.mutate(vars) },
    }),
  })

  const updateTaskMutation = useMutation(
    makeOptimisticMutation<Project, Error, { taskId: string; projectId: string; patch: ApiTaskPatchBody }>(
      queryClient,
      queryKeys.projects,
      {
        mutationFn: async ({ taskId, patch }) => {
          expectEden(await client.api.tasks({ id: taskId }).patch(patch))
          return {} as Project
        },
        optimisticUpdate: (prev, { taskId, projectId, patch }) =>
          cacheUpdateTask(prev, projectId, taskId, patch),
        onError: (_err, vars) => toast.error(i18next.t('toast.saveTaskFailed', { ns: 'projects' }), {
          action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => updateTaskMutation.mutate(vars) },
        }),
        onSettled: (_data, _err, { projectId, patch }) => {
          if (patch && ('milestoneId' in patch || 'status' in patch)) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) })
          }
        },
      },
    ),
  )

  const deleteTaskMutation = useMutation(
    makeOptimisticMutation<Project, Error, { taskId: string; projectId: string }>(
      queryClient,
      queryKeys.projects,
      {
        mutationFn: async ({ taskId }) => {
          expectEdenVoid(await client.api.tasks({ id: taskId }).delete())
          return {} as Project
        },
        optimisticUpdate: (prev, { taskId, projectId }) => cacheRemoveTask(prev, projectId, taskId),
        onError: (_err, vars) => toast.error(i18next.t('toast.deleteTaskFailed', { ns: 'projects' }), {
          action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => deleteTaskMutation.mutate(vars) },
        }),
        onSettled: (_data, _err, { projectId }) => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) })
        },
      },
    ),
  )

  const duplicateTaskMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string; projectId: string }) =>
      expectEden(await client.api.tasks({ id: taskId }).duplicate.post({})),
    onSuccess: (created, { projectId }) => {
      queryClient.setQueryData<Project[]>(queryKeys.projects, (prev = []) =>
        cacheAddTask(prev, projectId, created.status, created),
      )
      if (created.milestoneId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.projectMilestones(projectId) })
      }
    },
    onError: (_err, vars) => toast.error(i18next.t('toast.duplicateTaskFailed', { ns: 'projects' }), {
      action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => duplicateTaskMutation.mutate(vars) },
    }),
  })

  const reorderColumnsMutation = useMutation(
    makeOptimisticMutation<Project, Error, { projectId: string; updated: Record<UniqueIdentifier, Task[]> }>(
      queryClient,
      queryKeys.projects,
      {
        mutationFn: async ({ projectId, updated }) => {
          const columns: Record<string, string[]> = {}
          for (const [colId, colTasks] of Object.entries(updated)) {
            columns[colId] = (colTasks as Task[]).map((t) => t.id)
          }
          expectEdenVoid(await client.api.projects({ id: projectId }).columns.put({ columns }))
          return {} as Project
        },
        optimisticUpdate: (prev, { projectId, updated }) => cacheReorderColumns(prev, projectId, updated),
        onError: (_err, vars) => toast.error(i18next.t('toast.reorderColumnsFailed', { ns: 'projects' }), {
          action: { label: i18next.t('retry', { ns: 'common' }), onClick: () => reorderColumnsMutation.mutate(vars) },
        }),
      },
    ),
  )

  const addProject = (project: ApiProjectCreateBody) =>
    addProjectMutation.mutateAsync(project)
  const updateProject = async (patch: Partial<Project> & { id: string }): Promise<void> => { await updateProjectMutation.mutateAsync(patch) }
  const deleteProject = async (id: string) => { await deleteProjectMutation.mutateAsync(id) }
  const restoreProject = async (id: string) => { await restoreProjectMutation.mutateAsync(id) }
  const duplicateProject = (id: string) => duplicateProjectMutation.mutateAsync(id)
  const createTask = (projectId: string, columnId: Status, task: ApiTaskCreateBody) =>
    createTaskMutation.mutateAsync({ projectId, columnId, task })
  const updateTask = async (taskId: string, projectId: string, patch: ApiTaskPatchBody): Promise<void> => {
    await updateTaskMutation.mutateAsync({ taskId, projectId, patch })
  }
  const deleteTask = async (taskId: string, projectId: string): Promise<void> => {
    await deleteTaskMutation.mutateAsync({ taskId, projectId })
  }
  const duplicateTask = (taskId: string, projectId: string) =>
    duplicateTaskMutation.mutateAsync({ taskId, projectId })
  const reorderColumns = async (projectId: string, updated: Record<UniqueIdentifier, Task[]>): Promise<void> => {
    await reorderColumnsMutation.mutateAsync({ projectId, updated })
  }

  return {
    projects,
    trashedProjects,
    loading,
    isError,
    refetch,
    addProject,
    updateProject,
    deleteProject,
    restoreProject,
    duplicateProject,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    reorderColumns,
  }
}

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useProjectsContextValue()
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}
