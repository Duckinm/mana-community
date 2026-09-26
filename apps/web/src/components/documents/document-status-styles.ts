import type { DocumentStatus } from '@/components/documents/types'
import { AlertCircle, CircleCheck, CircleDashed, CircleX } from '@/components/icons'

export const DOCUMENT_STATUS_ICON = {
  draft: CircleDashed,
  published: CircleCheck,
  overdue: AlertCircle,
  archived: CircleX,
} satisfies Record<DocumentStatus, typeof CircleDashed>

export const DOCUMENT_STATUS_COLOR: Record<DocumentStatus, string> = {
  draft: 'var(--text-muted)',
  published: 'var(--success)',
  overdue: 'var(--category-orange)',
  archived: 'var(--danger)',
}
