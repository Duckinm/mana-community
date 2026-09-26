import { Search } from '@/components/icons'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { GetColorName } from 'hex-color-to-color-name'
import { useState, type ChangeEventHandler } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useTranslation } from 'react-i18next'

const HEX6 = /^#[0-9a-fA-F]{6}$/
const HEX3 = /^#[0-9a-fA-F]{3}$/

export function normalizeHexColor(color: string): string {
  if (HEX6.test(color)) return color.toLowerCase()
  if (HEX3.test(color)) {
    const c = color.slice(1)
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toLowerCase()
  }
  return color
}

function isValidHex(color: string): boolean {
  return HEX6.test(color) || HEX3.test(color)
}

export function ColorPicker({
  value = '#000000',
  onChange,
  className,
}: {
  value?: string
  onChange?: (color: string) => void
  className?: string
}) {
  const { t } = useTranslation('projects')
  const [search, setSearch] = useState('')
  const [error, setError] = useState(false)
  const pickerValue = normalizeHexColor(value)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value
    setSearch(input)
    setError(false)

    if (input.length === 0) return

    const hexInput = input.startsWith('#') ? input : `#${input}`

    if (isValidHex(hexInput)) {
      onChange?.(normalizeHexColor(hexInput))
    } else {
      setError(true)
    }
  }

  return (
    <div className={cn('flex flex-col rounded-md p-0', className)}>
      <ColorPickerSearch search={search} onValueChange={handleSearchChange} placeholder={t('colorPicker.hexPlaceholder')} />
      <span className="px-3 pt-3 pb-2 text-xs leading-none text-muted-foreground">
        {t('colorPicker.label')}
      </span>
      <HexColorPicker
        color={pickerValue}
        onChange={(next) => onChange?.(normalizeHexColor(next))}
        className="!h-[200px] !w-full px-3 pb-2"
      />
      <ColorPickerFooter error={error} value={pickerValue} />
    </div>
  )
}

export function ColorPickerSearch({
  search,
  onValueChange,
  placeholder,
}: {
  search: string
  onValueChange?: ChangeEventHandler<HTMLInputElement>
  placeholder: string
}) {
  return (
    <div className="flex h-9 items-center gap-2 border-b border-border-subtle px-3">
      <Search size={16} className="shrink-0 opacity-50" />
      <Input
        placeholder={placeholder}
        value={search}
        onChange={onValueChange}
        className="flex h-10 w-full rounded-md border-0 bg-transparent px-0 py-3 text-sm shadow-none ring-0 outline-none placeholder:text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none"
      />
    </div>
  )
}

function ColorPickerFooter({
  value,
  error,
  className,
  ...props
}: { value: string; error?: boolean } & React.ComponentProps<'div'>) {
  const { t } = useTranslation('projects')

  return (
    <div
      className={cn('flex w-full min-w-0 items-center gap-1 border-t border-border-subtle px-3 py-2', className)}
      {...props}
    >
      {error ? (
        <span className="text-xs text-muted-foreground">{t('colorPicker.invalid')}</span>
      ) : value.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle"
            style={{ backgroundColor: value }}
          />
          <span className="truncate text-xs text-muted-foreground">
            {GetColorName(value) ?? value}
          </span>
        </div>
      ) : (
        <span className="ml-1.5 flex h-7 items-center truncate text-xs text-muted-foreground">
          {t('colorPicker.selectColor')}
        </span>
      )}
    </div>
  )
}
