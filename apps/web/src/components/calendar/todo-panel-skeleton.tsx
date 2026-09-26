import { Skeleton } from '@/components/ui/skeleton'

export function TodoPanelSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      <Skeleton className="h-3.5 w-24" />
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}
