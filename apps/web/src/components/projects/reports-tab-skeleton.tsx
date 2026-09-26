import { Skeleton } from '@/components/ui/skeleton'

export function MetricsSkeleton() {
  return (
    <div className="list-shell">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border-subtle">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-border-subtle space-y-2">
        <Skeleton className="h-3 w-48 rounded-sm" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  )
}

export function DocumentPipelineSkeleton() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <Skeleton className="h-4 w-36 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function CashflowChartSkeleton() {
  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <Skeleton className="h-4 w-40 rounded-md" />
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  )
}

export function ReportsTabSkeleton() {
  return (
    <div className="space-y-4">
      <MetricsSkeleton />

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_1fr] gap-4 items-start">
        <div className="surface-card rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28 rounded-md" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <Skeleton className="h-3 w-24 rounded-sm" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
          </div>
        </div>

        <DocumentPipelineSkeleton />
      </div>

      <CashflowChartSkeleton />
    </div>
  )
}
