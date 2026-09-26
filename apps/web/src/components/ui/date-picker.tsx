import { useState, type MouseEvent } from 'react'
import { Calendar as CalendarIcon, X } from '@/components/icons'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  calendarDateToPicker,
  formatCalendarDate,
  normalizeCalendarDateField,
  toCalendarDateString,
} from '@/lib/calendar-date'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  id?: string
  value: string | null | undefined
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
  align?: 'start' | 'center' | 'end'
  disabled?: boolean
  clearable?: boolean
  size?: 'default' | 'sm'
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  align = 'start',
  disabled,
  clearable,
  size = 'default',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const normalized = normalizeCalendarDateField(value)
  const selected = calendarDateToPicker(normalized)
  const display = normalized ? formatCalendarDate(normalized) : null

  function handleClear(event: MouseEvent) {
    event.stopPropagation()
    onChange(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex w-full items-center border border-input bg-card text-sm text-foreground outline-none transition-colors duration-base',
            'hover:bg-surface-raised focus:border-border-strong focus:bg-surface-raised',
            'disabled:cursor-not-allowed disabled:opacity-40',
            size === 'sm'
              ? 'h-8 rounded-md px-2 text-xs'
              : 'h-10 rounded-lg px-4 py-3',
            !display && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon
            size={size === 'sm' ? 12 : 14}
            className="mr-2 shrink-0 opacity-60"
          />
          <span className="min-w-0 flex-1 truncate text-left">
            {display ?? placeholder}
          </span>
          {clearable && display ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="ml-1 flex shrink-0 items-center opacity-60 hover:opacity-100"
            >
              <X size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto overflow-hidden p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toCalendarDateString(date) : null)
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
