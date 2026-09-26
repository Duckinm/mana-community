import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { enUS, th } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import { ChevronDown, ChevronLeft, ChevronRight } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatCalendarMonthYear } from '@/components/calendar/calendar-format'
import { cn } from '@/lib/utils'

type CalendarTitlePickerProps = {
  activeDate: Date
  onSelectDate: (date: Date) => void
}

function dayPickerLocale(language: string) {
  return language.startsWith('th') ? th : enUS
}

export function CalendarTitlePicker({ activeDate, onSelectDate }: CalendarTitlePickerProps) {
  const { i18n } = useTranslation('calendar')
  const [open, setOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(activeDate)
  const locale = dayPickerLocale(i18n.language)
  const defaultClassNames = getDefaultClassNames()

  useEffect(() => {
    if (open) setPickerMonth(activeDate)
  }, [open, activeDate])

  const toolbarLabel = formatCalendarMonthYear(activeDate, i18n.language)

  const pickerCaption = useMemo(
    () => formatCalendarMonthYear(pickerMonth, i18n.language),
    [pickerMonth, i18n.language],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-base font-semibold tracking-tight text-foreground transition-colors hover:bg-surface-raised"
        >
          {toolbarLabel}
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn('text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-auto overflow-hidden p-0">
        <DayPicker
          mode="single"
          selected={activeDate}
          month={pickerMonth}
          onMonthChange={setPickerMonth}
          weekStartsOn={1}
          locale={locale}
          showOutsideDays
          navLayout="around"
          autoFocus
          formatters={{
            formatCaption: () => pickerCaption,
            formatWeekdayName: (date) => format(date, 'EEE', { locale }).toUpperCase(),
          }}
          modifiers={{
            weekend: (date) => {
              const day = date.getDay()
              return day === 0 || day === 6
            },
          }}
          modifiersClassNames={{
            weekend: 'rdp-weekend',
          }}
          onSelect={(date) => {
            if (!date) return
            onSelectDate(date)
            setOpen(false)
          }}
          className="calendar-title-picker p-3"
          classNames={{
            root: cn(defaultClassNames.root, 'calendar-title-picker-root'),
            months: cn(defaultClassNames.months, 'm-0 max-w-none'),
            month: cn(defaultClassNames.month, 'gap-2'),
            month_caption: cn(defaultClassNames.month_caption, 'mb-1 h-9'),
            caption_label: cn(defaultClassNames.caption_label, 'text-sm font-semibold'),
            nav: defaultClassNames.nav,
            button_previous: cn(
              defaultClassNames.button_previous,
              'inline-flex size-8 items-center justify-center rounded-md text-primary hover:bg-surface-raised',
            ),
            button_next: cn(
              defaultClassNames.button_next,
              'inline-flex size-8 items-center justify-center rounded-md text-primary hover:bg-surface-raised',
            ),
            month_grid: cn(defaultClassNames.month_grid, 'w-full'),
            weekdays: defaultClassNames.weekdays,
            weekday: cn(
              defaultClassNames.weekday,
              'w-9 p-0 text-[0.6875rem] font-medium uppercase text-muted-foreground',
            ),
            week: defaultClassNames.week,
            day: cn(defaultClassNames.day, 'w-9 p-0 text-center'),
            day_button: cn(
              defaultClassNames.day_button,
              'mx-auto size-8 rounded-full text-sm font-normal text-foreground hover:bg-surface-raised',
            ),
            today: cn(defaultClassNames.today, 'text-warning font-semibold'),
            outside: cn(defaultClassNames.outside, 'text-muted-foreground opacity-45'),
            selected: cn(defaultClassNames.selected, 'font-semibold'),
            chevron: cn(defaultClassNames.chevron, 'fill-primary'),
          }}
          components={{
            Chevron: ({ className, orientation, ...props }) => {
              const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
              return (
                <Icon
                  size={16}
                  strokeWidth={2.5}
                  className={cn('text-primary', className)}
                  {...props}
                />
              )
            },
          }}
        />
        <style>{`
          .calendar-title-picker {
            --rdp-accent-color: var(--primary);
            --rdp-accent-background-color: color-mix(in srgb, var(--primary) 14%, transparent);
            --rdp-day-width: 2.25rem;
            --rdp-day-height: 2.25rem;
            --rdp-day_button-width: 2rem;
            --rdp-day_button-height: 2rem;
            --rdp-nav_button-width: 2rem;
            --rdp-nav_button-height: 2rem;
            --rdp-nav-height: 2.25rem;
            --rdp-today-color: var(--warning);
            --rdp-selected-border: none;
          }
          .calendar-title-picker .rdp-month_grid {
            width: 100%;
          }
          .calendar-title-picker .rdp-weekday {
            width: 2.25rem;
            min-width: 2.25rem;
            padding: 0.35rem 0;
          }
          .calendar-title-picker .rdp-day {
            width: 2.25rem;
            min-width: 2.25rem;
          }
          .calendar-title-picker .rdp-selected .rdp-day_button {
            background: var(--primary);
            color: var(--primary-foreground);
          }
          .calendar-title-picker .rdp-weekend .rdp-day_button {
            color: color-mix(in srgb, var(--muted-foreground) 88%, transparent);
          }
        `}</style>
      </PopoverContent>
    </Popover>
  )
}
