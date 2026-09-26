import { cn } from '@/lib/utils'

export function projectAvatarRadius(size: number) {
  return Math.round(size * 0.22)
}

export function projectAvatarBoxStyle(size: number, color: string): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: projectAvatarRadius(size),
    background: color,
  }
}

/**
 * Project colours are user-picked, so a pale one leaves the white initial
 * unreadable — especially on the light theme's near-white surfaces.
 * ponytail: hex only; the picker never emits rgb()/hsl().
 */
function projectAvatarInk(color: string) {
  const hex = color.trim().replace('#', '')
  if (hex.length !== 3 && hex.length !== 6) return '#ffffff'
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.6 ? '#1a1917' : '#ffffff'
}

function projectAvatarEmojiNudge(size: number) {
  return `translate(${Math.round(size * 0.02)}px, ${Math.round(size * 0.06)}px)`
}

export function projectAvatarLetter(name: string) {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function ProjectIconBadge({
  content,
  color,
  size,
  kind = 'emoji',
  className,
}: {
  content: string
  color: string
  size: number
  kind?: 'emoji' | 'letter'
  className?: string
}) {
  const isEmoji = kind === 'emoji'

  return (
    <span
      className={cn('grid shrink-0 place-items-center overflow-hidden select-none', className)}
      style={projectAvatarBoxStyle(size, color)}
    >
      <span
        className={cn(!isEmoji && 'font-semibold')}
        style={{
          color: isEmoji ? undefined : projectAvatarInk(color),
          fontSize: Math.round(size * (isEmoji ? 0.52 : 0.46)),
          lineHeight: 1,
          transform: isEmoji ? projectAvatarEmojiNudge(size) : undefined,
        }}
      >
        {content}
      </span>
    </span>
  )
}

export function ProjectIconBadgeDisplay({
  name,
  icon,
  color,
  size,
  className,
}: {
  name: string
  icon?: string
  color: string
  size: number
  className?: string
}) {
  const hasIcon = Boolean(icon?.trim())

  return (
    <ProjectIconBadge
      content={hasIcon ? icon!.trim() : projectAvatarLetter(name)}
      color={color}
      size={size}
      kind={hasIcon ? 'emoji' : 'letter'}
      className={className}
    />
  )
}

export function ProjectAvatar({
  project,
  size = 20,
  className,
}: {
  project: { name: string; color: string; icon?: string }
  size?: number
  className?: string
}) {
  if (project.icon?.trim()) {
    return (
      <ProjectIconBadge
        content={project.icon.trim()}
        color={project.color}
        size={size}
        className={className}
      />
    )
  }

  return (
    <ProjectIconBadge
      content={projectAvatarLetter(project.name)}
      color={project.color}
      size={size}
      kind="letter"
      className={className}
    />
  )
}
