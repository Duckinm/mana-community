import { Skeleton } from '@/components/ui/skeleton'

export function ChatUiOverlaySkeleton() {
  return (
    <div className="space-y-4 p-1">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-xl" />
    </div>
  )
}
