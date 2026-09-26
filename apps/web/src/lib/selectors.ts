import type { Document } from '@/components/documents/types'
import type { Project } from '@/components/projects/types'

export function enrichWithProjectName(docs: Document[], projects: Project[]): Document[] {
  if (projects.length === 0) return docs
  const projectMap = new Map(projects.map((p) => [p.id, p]))
  return docs.map((doc) => {
    const project = doc.projectId ? projectMap.get(doc.projectId) : undefined
    return {
      ...doc,
      projectName: project?.name ?? null,
      projectIcon: project?.icon ?? null,
      projectColor: project?.color ?? null,
    }
  })
}

export function defaultSenderProfile<T extends { isDefault: boolean }>(profiles: T[]): T | null {
  return profiles.find((p) => p.isDefault) ?? profiles[0] ?? null
}

export function defaultRemarkTemplate<T extends { defaultFor: readonly string[] }>(
  templates: T[],
  documentType: string,
): T | null {
  return templates.find((template) => template.defaultFor.includes(documentType)) ?? null
}
