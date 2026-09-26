import { ColorEmojiToolbar } from '@/components/projects/color-emoji-toolbar'
import { ProjectIconBadgeDisplay } from '@/components/projects/project-avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function ColorEmojiPicker({
  icon,
  color,
  name,
  onIconChange,
  onColorChange,
  trigger,
  size = 36,
  className,
}: {
  icon: string
  color: string
  name: string
  onIconChange: (icon: string) => void
  onColorChange: (color: string) => void
  trigger?: React.ReactNode
  size?: number
  className?: string
}) {
  const { t } = useTranslation('projects')

  return (
    // modal registers the portal with any parent dialog's scroll lock, so wheel/trackpad scrolling works inside
    <Popover modal>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn('transition-transform hover:scale-105', className)}
            aria-label={t('iconPicker.editIcon')}
          >
            <ProjectIconBadgeDisplay name={name} icon={icon} color={color} size={size} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto overflow-hidden p-0">
        <ColorEmojiToolbar
          color={color}
          onColorChange={onColorChange}
          emoji={icon}
          onEmojiChange={onIconChange}
        />
      </PopoverContent>
    </Popover>
  )
}
