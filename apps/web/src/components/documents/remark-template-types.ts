import type { DocumentType } from '@/components/documents/types'

export interface RemarkTemplate {
  id: string
  userId: string
  name: string
  body: string
  defaultFor: DocumentType[]
  position: number
  createdAt: string
  updatedAt: string
}

export type RemarkTemplateInput = {
  name: string
  body?: string
  defaultFor?: DocumentType[]
}
