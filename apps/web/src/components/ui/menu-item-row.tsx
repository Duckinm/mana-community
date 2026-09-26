import type { ReactNode } from 'react'
import { Check } from '@/components/icons'
import { cn } from '@/lib/utils'

type MenuItemRowProps = {
  children: ReactNode
  active?: boolean
  end?: ReactNode
  className?: string
}

export function MenuItemRow({ children, active, end, className }: MenuItemRowProps) {
  return (
    <span className={cn('flex w-full items-center justify-between gap-3', className)}>
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
      {(end || active) && (
        <span className="flex shrink-0 items-center gap-2">
          {end}
          {active && <Check className="size-3.5 text-primary" strokeWidth={2.5} />}
        </span>
      )}
    </span>
  )
}
