import { useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from '@/components/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import type { WizardForm } from '@/components/documents/wizard/document-wizard-state'
import { useTranslation } from 'react-i18next'

export const CURRENCIES = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'THB', label: 'Thai Baht', symbol: '฿' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { value: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$' },
  { value: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM' },
  { value: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp' },
  { value: 'VND', label: 'Vietnamese Dong', symbol: '₫' },
  { value: 'KRW', label: 'South Korean Won', symbol: '₩' },
  { value: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
]

export function localizedCurrencyName(currency: (typeof CURRENCIES)[number], language: string): string {
  return new Intl.DisplayNames(language, { type: 'currency' }).of(currency.value) ?? currency.label
}

interface CurrencyComboboxProps {
  form: WizardForm
}

export function CurrencyCombobox({ form }: CurrencyComboboxProps) {
  const { t, i18n } = useTranslation('documents')
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [panelWidth, setPanelWidth] = useState<number>()
  const language = i18n.resolvedLanguage ?? i18n.language

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    setPanelWidth(triggerRef.current.getBoundingClientRect().width)
  }, [open])

  return (
    <form.Field name="currency">
      {(field) => {
        const selected = CURRENCIES.find((c) => c.value === field.state.value)
        return (
          <div className="relative flex h-[52px] w-full items-center gap-3 text-sm">
            <span className="shrink-0 whitespace-nowrap font-medium pr-1 text-ink">
              {t('currencyCombobox.currency')}
            </span>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  ref={triggerRef}
                  type="button"
                  data-currency-trigger
                  className="flex h-9 min-h-0 flex-1 items-center gap-2 outline-none text-right"
                >
                  <span className="flex-1 min-w-0 text-ink">
                    {selected ? (
                      <span className="block truncate">
                        <span className="font-mono mr-1 tabular-nums text-muted-foreground">
                          {selected.symbol}
                        </span>
                        {selected.value}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          — {localizedCurrencyName(selected, language)}
                        </span>
                      </span>
                    ) : (
                      <span className="block truncate text-muted-foreground">
                        {t('currencyCombobox.selectCurrency')}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 opacity-40 transition-transform',
                      open && '-rotate-180'
                    )}
                  />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                sideOffset={4}
                avoidCollisions
                className={cn(
                  'rounded-xl border border-border-subtle bg-surface-overlay p-0 shadow-popup overflow-hidden',
                  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
                )}
                style={panelWidth ? { width: panelWidth } : undefined}
              >
                <Command
                  className={cn(
                    'rounded-xl',
                    '[&_[cmdk-group]]:p-1 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-1.5',
                    '[&_[cmdk-item][data-selected=true]]:bg-accent [&_[cmdk-item][data-selected=true]]:text-foreground',
                    '[&_div[cmdk-input-wrapper]]:border-border [&_div[cmdk-input-wrapper]]:px-2.5 [&_div[cmdk-input-wrapper]]:py-0',
                    '[&_div[cmdk-input-wrapper]_svg]:size-3.5 [&_div[cmdk-input-wrapper]_svg]:opacity-40'
                  )}
                >
                  <CommandInput
                    placeholder={t('currencyCombobox.searchCurrency')}
                    className="h-9 py-2 text-sm placeholder:text-muted-foreground"
                  />
                  <CommandList className="max-h-[min(18rem,var(--radix-popover-content-available-height))]">
                    <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                      {t('currencyCombobox.noCurrencyFound')}
                    </CommandEmpty>
                    <CommandGroup>
                      {CURRENCIES.map((currency) => (
                        <CommandItem
                          key={currency.value}
                          value={`${currency.value} ${currency.label} ${localizedCurrencyName(currency, language)} ${currency.symbol}`}
                          className={cn(
                            'cursor-pointer rounded-md text-sm',
                            'data-[selected=true]:bg-accent data-[selected=true]:text-foreground'
                          )}
                          onSelect={() => {
                            field.handleChange(currency.value)
                            setOpen(false)
                          }}
                        >
                          <span className="font-mono w-6 shrink-0 text-left tabular-nums text-xs text-muted-foreground">
                            {currency.symbol}
                          </span>
                          <span className="font-medium tabular-nums">{currency.value}</span>
                          <span className="min-w-0 flex-1 truncate font-normal text-muted-foreground">
                            {localizedCurrencyName(currency, language)}
                          </span>
                          <Check
                            size={14}
                            className={cn(
                              'ml-1 shrink-0 text-warning',
                              field.state.value === currency.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 transition-colors"
              style={{
                borderTop: `1px dashed ${open ? 'var(--warning)' : 'var(--border-strong)'}`,
              }}
            />
          </div>
        )
      }}
    </form.Field>
  )
}
