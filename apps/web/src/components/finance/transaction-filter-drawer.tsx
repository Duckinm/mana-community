import {
  STATUS_COLOR,
} from '@/components/finance/constants'
import type { TransactionStatus, TransactionType } from '@/components/finance/types'
import {
  ArrowDownUp,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  CircleDot,
  ListFilter,
  X,
} from '@/components/icons'
import { Calendar } from '@/components/ui/calendar'
import { Sheet, SheetDragRegion } from '@/components/ui/sheet'
import {
  calendarDateFromPicker,
  calendarDateToPicker,
  formatCalendarDateShort,
} from '@/lib/calendar-date'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'

export type TransactionFilterState = {
  type: 'all' | TransactionType
  status: 'all' | TransactionStatus
  from: string | undefined
  to: string | undefined
}

type FilterSection = 'type' | 'status' | 'date'

function RadioList<T extends string>({
  options,
  selected,
  onSelect,
  renderDot,
}: {
  options: { value: T; label: string }[]
  selected: T
  onSelect: (v: T) => void
  renderDot?: (v: T) => React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 p-1.5">
      {options.map(({ value, label }) => {
        const active = selected === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className={cn(
              'flex min-h-9 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-raised',
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <span className="flex min-w-0 items-center gap-3">
              {renderDot?.(value)}
              {label}
            </span>
            {active && (
              <Check size={14} strokeWidth={2.5} className="shrink-0 text-primary" />
            )}
          </button>
        )
      })}
    </div>
  )
}

function AccordionSection({
  icon: Icon,
  label,
  summary,
  active,
  open,
  onToggle,
  children,
}: {
  icon: typeof ListFilter
  label: string
  summary?: string
  active: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-9 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-raised/60"
      >
        <Icon
          size={15}
          strokeWidth={1.75}
          className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          {summary && (
            <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="border-t border-border-subtle/70">{children}</div>}
    </div>
  )
}

function isFilterActive(f: TransactionFilterState) {
  return f.type !== 'all' || f.status !== 'all' || !!f.from || !!f.to
}

export function MobileTransactionFilterButton({
  filter,
  onChange,
}: {
  filter: TransactionFilterState
  onChange: (next: TransactionFilterState) => void
}) {
  const { t } = useTranslation('accounting')
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<FilterSection | null>(null)

  const typeOptions: { value: TransactionFilterState['type']; label: string }[] = [
    { value: 'all', label: t('transactions.typeAll') },
    { value: 'revenue', label: t('transactions.typeRevenue') },
    { value: 'expense', label: t('transactions.typeExpense') },
  ]

  const statusOptions: { value: TransactionFilterState['status']; label: string }[] = [
    { value: 'all', label: t('transactions.statusAll') },
    { value: 'received', label: t('transactions.statusReceived') },
    { value: 'pending', label: t('transactions.statusPending') },
    { value: 'overdue', label: t('transactions.statusOverdue') },
    { value: 'paid', label: t('transactions.statusPaid') },
  ]

  const active = isFilterActive(filter)
  const typeSummary =
    filter.type !== 'all'
      ? typeOptions.find((o) => o.value === filter.type)?.label
      : undefined
  const statusSummary =
    filter.status !== 'all'
      ? statusOptions.find((o) => o.value === filter.status)?.label
      : undefined
  const dateSummary =
    filter.from || filter.to
      ? `${filter.from ? formatCalendarDateShort(filter.from) : '…'} – ${filter.to ? formatCalendarDateShort(filter.to) : '…'}`
      : undefined

  const activeChips = [
    typeSummary && {
      key: 'type' as const,
      icon: ArrowDownUp,
      label: t('transactions.filterType'),
      summary: typeSummary,
    },
    statusSummary && {
      key: 'status' as const,
      icon: CircleDot,
      label: t('transactions.filterStatus'),
      summary: statusSummary,
    },
    dateSummary && {
      key: 'date' as const,
      icon: CalendarIcon,
      label: t('transactions.dateRange'),
      summary: dateSummary,
    },
  ].filter(Boolean) as {
    key: FilterSection
    icon: typeof ListFilter
    label: string
    summary: string
  }[]

  const range: DateRange = {
    from: calendarDateToPicker(filter.from),
    to: calendarDateToPicker(filter.to),
  }

  function clearAll() {
    onChange({ type: 'all', status: 'all', from: undefined, to: undefined })
  }

  function closeDrawer(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) setExpanded(null)
  }

  return (
    <>
      <div className="flex max-w-full flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('transactions.filters')}
          aria-expanded={open}
          className="flex max-w-full flex-wrap items-center gap-1.5"
        >
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
              active
                ? 'border-primary-border bg-primary-soft text-primary'
                : 'border-border-default text-muted-foreground hover:bg-surface-raised hover:text-foreground',
            )}
          >
            <ListFilter size={16} strokeWidth={active ? 2.25 : 1.75} />
          </span>
          {activeChips.map(({ key, icon: Icon, label, summary }) => (
            <span
              key={key}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-border bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary"
            >
              <Icon size={13} strokeWidth={2} className="shrink-0" />
              <span className="max-w-40 truncate">
                <span className="opacity-80">{label}:</span> {summary}
              </span>
            </span>
          ))}
        </button>
        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 px-1.5 text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
          >
            {t('transactions.clearAllFilters')}
          </button>
        )}
      </div>

      <Sheet
        open={open}
        onOpenChange={closeDrawer}
        side="bottom"
        className="h-[min(68dvh,36rem)] pb-[env(safe-area-inset-bottom)]"
      >
        <SheetDragRegion className="flex shrink-0 items-center gap-2 px-3 pb-3">
          <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
            <ListFilter size={16} strokeWidth={1.75} />
          </span>
          <p className="min-w-0 flex-1 text-left text-sm font-semibold tracking-tight">
            {t('transactions.filters')}
          </p>
          {active && (
            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 px-2 text-xs font-medium text-muted-foreground transition-opacity hover:opacity-70"
            >
              {t('transactions.clearAllFilters')}
            </button>
          )}
          <button
            type="button"
            aria-label={t('transactions.closeFilters')}
            onClick={() => closeDrawer(false)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </SheetDragRegion>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="mb-2 px-1 text-[0.6875rem] font-medium uppercase tracking-wide text-caption">
            {t('transactions.allFilters')}
          </p>
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-surface-raised/40">
            <AccordionSection
              icon={ArrowDownUp}
              label={t('transactions.filterType')}
              summary={typeSummary}
              active={filter.type !== 'all'}
              open={expanded === 'type'}
              onToggle={() =>
                setExpanded((current) => (current === 'type' ? null : 'type'))
              }
            >
              <RadioList
                options={typeOptions}
                selected={filter.type}
                onSelect={(type) => onChange({ ...filter, type })}
              />
            </AccordionSection>

            <AccordionSection
              icon={CircleDot}
              label={t('transactions.filterStatus')}
              summary={statusSummary}
              active={filter.status !== 'all'}
              open={expanded === 'status'}
              onToggle={() =>
                setExpanded((current) => (current === 'status' ? null : 'status'))
              }
            >
              <RadioList
                options={statusOptions}
                selected={filter.status}
                onSelect={(status) => onChange({ ...filter, status })}
                renderDot={(v) =>
                  v === 'all' ? null : (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[v as TransactionStatus] }}
                    />
                  )
                }
              />
            </AccordionSection>

            <AccordionSection
              icon={CalendarIcon}
              label={t('transactions.dateRange')}
              summary={dateSummary}
              active={!!filter.from || !!filter.to}
              open={expanded === 'date'}
              onToggle={() =>
                setExpanded((current) => (current === 'date' ? null : 'date'))
              }
            >
              <div className="p-2">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={(r) =>
                    onChange({
                      ...filter,
                      from: calendarDateFromPicker(r?.from),
                      to: calendarDateFromPicker(r?.to),
                    })
                  }
                  autoFocus
                />
                {(filter.from || filter.to) && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...filter, from: undefined, to: undefined })
                    }
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground"
                  >
                    {t('transactions.clearDateRange')}
                  </button>
                )}
              </div>
            </AccordionSection>
          </div>
        </div>
      </Sheet>
    </>
  )
}
