import { useState } from 'react'
import { CalendarIcon } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  formatCalendarDate,
  parseCalendarDate,
  toCalendarDateString,
} from '@/lib/calendar-date'
import { useTranslation } from 'react-i18next'

interface DatePickerProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  /** Earliest selectable calendar date (`YYYY-MM-DD`). */
  min?: string | null
}

export function DatePicker({ label, value, onChange, min }: DatePickerProps) {
  const { t } = useTranslation('documents')
  const [open, setOpen] = useState(false)

  const selectedDate = parseCalendarDate(value) ?? undefined
  const minDate = parseCalendarDate(min) ?? undefined
  const displayValue = selectedDate ? formatCalendarDate(selectedDate) : null

  return (
    <div className="relative flex items-center h-[52px]">
      <span className="text-sm font-medium whitespace-nowrap shrink-0 pr-4 text-ink">
        {label}
      </span>
      <div className="flex-1 flex justify-end">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-right outline-none transition-colors text-caption hover:text-warning focus:text-warning"
            >
              {displayValue
                ? <span>{displayValue}</span>
                : <span className="text-muted-foreground">{t('datePicker.pickADate')}</span>
              }
              <CalendarIcon size={14} className="shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              disabled={minDate ? { before: minDate } : undefined}
              onSelect={(date) => {
                onChange(date ? toCalendarDateString(date) : null)
                setOpen(false)
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="absolute inset-x-0 bottom-0 transition-colors border-t border-dashed border-border-strong" />
    </div>
  )
}
