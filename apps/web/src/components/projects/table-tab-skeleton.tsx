import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const GROUPS = [
  { rows: 1 },
  { rows: 3 },
  { rows: 0 },
  { rows: 0 },
] as const

export function TableTabSkeleton() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4 xl:mb-5">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-6 rounded-lg"
              style={{ width: i === 0 ? 36 : 68 + i * 4 }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16 rounded-sm" />
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
      </div>

      <div className="list-shell stagger-fade">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'border-t border-border-subtle')}>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded-sm" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <Skeleton className="h-3 w-20 rounded-sm" />
                <Skeleton className="h-5 w-6 rounded-md" />
              </div>
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
            {Array.from({ length: group.rows }).map((_, ri) => (
              <div key={ri} className="flex items-center px-4 py-2.5">
                <Skeleton
                  className="h-3.5 flex-1 rounded-md"
                  style={{ maxWidth: `${50 + ((gi + ri) % 3) * 12}%` }}
                />
                <div className="ml-auto flex items-center gap-2 pl-4">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-4 w-4 rounded-sm" />
                  <Skeleton className="h-3 w-12 rounded-sm" />
                  <Skeleton className="h-4 w-14 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
