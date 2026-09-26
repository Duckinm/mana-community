import { Skeleton } from '@/components/ui/skeleton'

export function MilestonesPanelSkeleton() {
  return (
    <div className="mt-6">
      <Skeleton className="mb-3 h-3 w-20 rounded-md" />
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            <Skeleton className="h-3.5 w-40 flex-1 rounded-md" />
            <Skeleton className="h-3 w-12 rounded-sm" />
            <Skeleton className="h-3 w-8 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
