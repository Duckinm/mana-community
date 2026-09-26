import { PRIORITY_COLOR } from '@/components/projects/constants'
import type { Priority } from '@/components/projects/types'

export function PriorityBars({ priority }: { priority: Priority }) {
  const active = priority === 'high' ? 3 : priority === 'med' ? 2 : 1
  const color = PRIORITY_COLOR[priority]
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="shrink-0">
      {[1, 2, 3].map((level) => (
        <rect
          key={level}
          x={1 + (level - 1) * 4.5}
          y={16 - level * 3.5}
          width="2.5"
          height={level * 3.5}
          rx="0.5"
          fill={level <= active ? color : 'currentColor'}
          className={level <= active ? undefined : 'text-muted-foreground/25'}
        />
      ))}
    </svg>
  )
}
