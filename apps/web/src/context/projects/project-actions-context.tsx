import { createContext, useContext } from 'react'
import type { Project } from '@/components/projects/types'

export interface ProjectActions {
  updateProject: (patch: Partial<Project>) => void
  archiveToggle: () => void
  duplicate: () => void
  deleteProject: () => void
}

export const ProjectActionsContext = createContext<ProjectActions | null>(null)

/** Lets nested tab routes (e.g. Overview) trigger project mutations owned by the project layout */
export function useProjectActions() {
  const ctx = useContext(ProjectActionsContext)
  if (!ctx) throw new Error('useProjectActions must be used within the project layout')
  return ctx
}
