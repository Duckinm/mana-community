import { Skeleton } from '@/components/ui/skeleton'

export function CalendarViewSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 border-b border-border-subtle px-4 py-3">
        <Skeleton className="h-8 w-[7.5rem] justify-self-start rounded-lg" />
        <Skeleton className="h-8 w-36 justify-self-center rounded-md" />
        <div className="flex min-w-0 flex-wrap items-center justify-end justify-self-end gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-[11.5rem] rounded-lg" />
        </div>
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-none" />
    </div>
  )
}
