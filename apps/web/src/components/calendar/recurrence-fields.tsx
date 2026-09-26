import { Repeat } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { defaultRecurrenceFormValues, type RecurrenceFormValues } from '@/lib/calendar-recurrence'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const PRESET_FREQS = ['daily', 'weekly', 'monthly', 'yearly'] as const

const PRESET_LABEL_KEYS: Record<(typeof PRESET_FREQS)[number], string> = {
  daily: 'recurrence.everyDay',
  weekly: 'recurrence.everyWeek',
  monthly: 'recurrence.everyMonth',
  yearly: 'recurrence.everyYear',
}

type RecurrenceFieldsProps = {
  value: RecurrenceFormValues
  /** True when the user picked "Custom…" — presets and custom weekly are not distinguishable from the rrule alone. */
  custom: boolean
  onChange: (value: RecurrenceFormValues, custom: boolean) => void
}

export function RecurrenceFields({ value, custom, onChange }: RecurrenceFieldsProps) {
  const { t } = useTranslation('calendar')

  function toggleWeekday(index: number) {
    const weekdays = value.weekdays.includes(index)
      ? value.weekdays.filter((day) => day !== index)
      : [...value.weekdays, index].sort()
    onChange({ ...value, weekdays: weekdays.length > 0 ? weekdays : [index] }, custom)
  }

  const selectValue = !value.enabled ? 'none' : custom ? 'custom' : value.freq

  function handleSelect(next: string) {
    if (next === 'none') {
      onChange(defaultRecurrenceFormValues(), false)
    } else if (next === 'custom') {
      onChange({ ...value, enabled: true }, true)
    } else {
      // Presets recur on the event's start day: no explicit weekdays, interval 1, no end.
      onChange(
        {
          enabled: true,
          freq: next as RecurrenceFormValues['freq'],
          interval: 1,
          until: null,
          weekdays: [],
        },
        false,
      )
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Label className="w-16 shrink-0 text-xs">{t('recurrence.repeat')}</Label>
        <div className="min-w-0 flex-1">
          <Select value={selectValue} onValueChange={handleSelect}>
            <SelectTrigger className="w-3/4 [&>span]:flex-1">
              <Repeat className="mr-2 size-3.5 shrink-0 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('recurrence.none')}</SelectItem>
              {PRESET_FREQS.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {t(PRESET_LABEL_KEYS[freq])}
                </SelectItem>
              ))}
              <SelectItem value="custom">{t('recurrence.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {value.enabled && custom && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('recurrence.frequency')}</Label>
              <Select
                value={value.freq}
                onValueChange={(freq) =>
                  onChange({ ...value, freq: freq as RecurrenceFormValues['freq'] }, custom)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('recurrence.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('recurrence.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('recurrence.monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('recurrence.yearly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-interval">{t('recurrence.interval')}</Label>
              <Input
                id="event-interval"
                type="number"
                min={1}
                value={value.interval}
                onChange={(e) =>
                  onChange({ ...value, interval: Math.max(1, Number(e.target.value) || 1) }, custom)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-until">{t('recurrence.until')}</Label>
            <DatePicker
              id="event-until"
              value={value.until}
              placeholder={t('form.pickDate')}
              clearable
              onChange={(date) => onChange({ ...value, until: date }, custom)}
            />
          </div>

          {value.freq === 'weekly' && (
            <div className="space-y-1.5">
              <Label>{t('recurrence.weekdays')}</Label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_KEYS.map((key, index) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleWeekday(index)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                      value.weekdays.includes(index)
                        ? 'border-primary-border bg-primary-soft text-primary'
                        : 'border-border-subtle text-muted-foreground hover:border-border-default',
                    )}
                  >
                    {t(`recurrence.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
