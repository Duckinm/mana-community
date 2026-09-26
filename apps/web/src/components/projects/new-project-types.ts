import type { TiptapDoc } from '@/lib/rich-text'

export type NewProjectMilestoneDraft = {
  id: string
  name: string
  dueDate?: string
}

export type NewProjectInput = {
  name: string
  client: string
  contactId: string | null
  color: string
  icon: string
  objective: string
  description: TiptapDoc | null
  milestones: { name: string; dueDate?: string }[]
}
