import { formatDueLabel, parseDueValue } from '@/components/projects/due-helpers'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function TaskDueDatePicker({
  due,
  onChange,
  trigger,
  align = 'end',
  onContentClick,
  beforeCalendar,
  showClear = true,
  emptyValue = null,
}: {
  due: string | null | undefined
  onChange: (due: string | null) => void
  trigger: ReactNode
  align?: 'start' | 'end'
  onContentClick?: (event: React.MouseEvent) => void
  beforeCalendar?: (close: () => void) => ReactNode
  showClear?: boolean
  emptyValue?: string | null
}) {
  const { t } = useTranslation('projects')
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align} onClick={onContentClick}>
        {beforeCalendar?.(close)}
        <Calendar
          mode="single"
          selected={parseDueValue(due)}
          onSelect={(date) => {
            if (date) onChange(formatDueLabel(date))
            close()
          }}
          autoFocus
        />
        {showClear && due ? (
          <button
            type="button"
            onClick={() => {
              onChange(emptyValue)
              close()
            }}
            className="w-full border-t border-border-subtle px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
          >
            {t('taskMenu.clearDueDate')}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
