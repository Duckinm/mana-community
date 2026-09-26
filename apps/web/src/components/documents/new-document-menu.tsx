import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { FileText, Receipt } from '@/components/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const TYPE_ICONS = {
  QO: FileText,
  INV: Receipt,
  RC: Receipt,
} as const

export function NewDocumentMenu({
  trigger,
  projectId,
  align = 'end',
}: {
  trigger: React.ReactNode
  projectId?: string
  align?: 'start' | 'end'
}) {
  const navigate = useNavigate()
  const { t } = useTranslation('documents')

  const DOCUMENT_TYPE_OPTIONS = [
    { type: 'QO' as const, label: t('newDocumentMenu.quotation'), description: t('newDocumentMenu.quotationDescription') },
    { type: 'INV' as const, label: t('newDocumentMenu.invoice'), description: t('newDocumentMenu.invoiceDescription') },
    { type: 'RC' as const, label: t('newDocumentMenu.receipt'), description: t('newDocumentMenu.receiptDescription') },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        {DOCUMENT_TYPE_OPTIONS.map(({ type, label, description }) => {
          const Icon = TYPE_ICONS[type]
          return (
            <DropdownMenuItem
              key={type}
              onClick={() =>
                navigate({ to: '/documents/new', search: { type, projectId } })
              }
              className="cursor-pointer py-2.5"
            >
              <span className="flex items-start gap-2.5">
                <Icon size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                <span className="flex flex-col gap-0">
                  <span className="font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
