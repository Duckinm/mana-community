import { ColorPicker } from '@/components/ui/color-picker'
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from '@/components/ui/emoji-picker'
import { PROJECT_COLORS } from '@/components/projects/constants'
import { projectColorToHex } from '@/lib/project-color'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type Tab = 'emoji' | 'color'

export function ColorEmojiToolbar({
  color,
  onColorChange,
  emoji: _emoji,
  onEmojiChange,
  className,
}: {
  color: string
  onColorChange: (color: string) => void
  emoji: string
  onEmojiChange: (emoji: string) => void
  className?: string
}) {
  const { t } = useTranslation('projects')
  const [tab, setTab] = useState<Tab>('emoji')
  const pickerColor = projectColorToHex(color)

  return (
    <div className={cn('w-[252px]', className)}>
      <div className="grid grid-cols-2 border-b border-border-subtle">
        {(['emoji', 'color'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'h-8 text-xs font-medium transition-colors',
              tab === value
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`iconPicker.${value}Tab`)}
          </button>
        ))}
      </div>

      {tab === 'emoji' ? (
        <EmojiPicker className="h-[280px] w-full" onEmojiSelect={(selected) => onEmojiChange(selected.emoji)}>
          <EmojiPickerSearch />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      ) : (
        <div>
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
            {PROJECT_COLORS.map((swatch) => {
              const swatchHex = projectColorToHex(swatch)
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatchHex)}
                  aria-label={swatchHex}
                  className={cn(
                    'size-6 rounded-full border border-border-subtle transition-transform duration-fast ease-in-out hover:scale-110',
                    pickerColor === swatchHex &&
                      'ring-2 ring-border-strong ring-offset-2 ring-offset-surface-overlay',
                  )}
                  style={{ backgroundColor: swatch }}
                />
              )
            })}
          </div>
          <ColorPicker value={pickerColor} onChange={onColorChange} />
        </div>
      )}
    </div>
  )
}
