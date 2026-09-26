import { DOCUMENT_STATUS_DESCRIPTION_KEYS, DOCUMENT_STATUS_KEYS } from '@/components/documents/constants'
import {
  DOCUMENT_STATUS_COLOR,
  DOCUMENT_STATUS_ICON,
} from '@/components/documents/document-status-styles'
import type { DocumentStatus, DocumentType } from '@/components/documents/types'
import { documentDisplayStatus } from '@/lib/document-helpers'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function DocumentStatusIcon({
  status,
  type,
  dueDate,
  size = 15,
  className,
}: {
  status: DocumentStatus
  type: DocumentType
  dueDate?: string | null
  size?: number
  className?: string
}) {
  const { t } = useTranslation('documents')
  const displayStatus =
    dueDate !== undefined ? documentDisplayStatus({ status, dueDate }) : status
  const Icon = DOCUMENT_STATUS_ICON[displayStatus]
  const color = DOCUMENT_STATUS_COLOR[displayStatus]
  const label = t(DOCUMENT_STATUS_KEYS[displayStatus])
  const descriptionKey = DOCUMENT_STATUS_DESCRIPTION_KEYS[type]?.[displayStatus]
  const description = descriptionKey ? t(descriptionKey) : undefined

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('inline-flex shrink-0 items-center justify-center', className)}
          aria-label={label}
        >
          <Icon size={size} strokeWidth={2} style={{ color }} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        <p className="font-medium">{label}</p>
        {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
      </TooltipContent>
    </Tooltip>
  )
}
