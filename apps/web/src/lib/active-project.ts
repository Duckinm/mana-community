import { useSyncExternalStore } from 'react'

export const ACTIVE_PROJECT_KEY = 'fos:active-project'

let listeners: (() => void)[] = []

export function setActiveProjectId(id: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id)
  for (const listener of listeners) listener()
}

export function isActiveProject(project: { archived?: boolean; deletedAt?: string | null } | undefined) {
  return Boolean(project && !project.archived && !project.deletedAt)
}

/** Reactive stored active-project id — updates subscribers without a navigation. */
export function useActiveProjectId(): string | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.push(cb)
      return () => {
        listeners = listeners.filter((l) => l !== cb)
      }
    },
    () => localStorage.getItem(ACTIVE_PROJECT_KEY),
    () => null,
  )
}

/** Same resolution as the sidebar project picker: stored project if it exists, else the first active one. */
export function resolveActiveProject<T extends { id: string; archived?: boolean }>(
  projects: T[],
  storedId: string | null,
): T | undefined {
  const active = projects.filter((p) => isActiveProject(p))
  return active.find((p) => p.id === storedId) ?? active[0]
}
