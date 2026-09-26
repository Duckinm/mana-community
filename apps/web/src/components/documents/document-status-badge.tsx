import type { DocumentStatus, DocumentType } from '@/components/documents/types'
import { DOCUMENT_STATUS_DESCRIPTION_KEYS, DOCUMENT_STATUS_KEYS } from '@/components/documents/constants'
import {
  DOCUMENT_STATUS_COLOR,
  DOCUMENT_STATUS_ICON,
} from '@/components/documents/document-status-styles'
import { documentDisplayStatus } from '@/lib/document-helpers'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const STATUS_CLASS: Record<DocumentStatus, string> = {
 draft: 'text-ink-muted bg-surface-raised border border-border-default',
 published: 'text-success bg-success-soft border border-success-border',
 archived: 'text-destructive bg-danger-soft',
 overdue: 'text-category-orange bg-category-orange-soft border border-category-orange/25',
}

export function DocumentStatusBadge({
  status,
  type,
  dueDate,
}: {
  status: DocumentStatus
  type: DocumentType
  dueDate?: string | null
}) {
 const { t } = useTranslation('documents')
 const displayStatus = dueDate !== undefined ? documentDisplayStatus({ status, dueDate }) : status
 const descriptionKey = DOCUMENT_STATUS_DESCRIPTION_KEYS[type]?.[displayStatus]
 const description = descriptionKey ? t(descriptionKey) : undefined
 const Icon = DOCUMENT_STATUS_ICON[displayStatus]
 const iconColor = DOCUMENT_STATUS_COLOR[displayStatus]

 const badge = (
 <span
 className={cn(
 'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap',
 description && 'cursor-default',
 STATUS_CLASS[displayStatus],
 )}
 >
 <Icon size={12} strokeWidth={2} style={{ color: iconColor }} />
 {t(DOCUMENT_STATUS_KEYS[displayStatus])}
 </span>
 )

 if (!description) return badge

 return (
 <Tooltip>
 <TooltipTrigger asChild>{badge}</TooltipTrigger>
 <TooltipContent side="bottom" className="max-w-64">
 {description}
 </TooltipContent>
 </Tooltip>
 )
}
