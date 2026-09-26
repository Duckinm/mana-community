import { Skeleton } from '@/components/ui/skeleton'

const ROWS = 5

export function TransactionListSkeleton({ toolbar }: { toolbar?: React.ReactNode }) {
  return (
    <>
      {toolbar && <div className="mb-3">{toolbar}</div>}
      <div className="list-shell stagger-fade">
        <div className="border-b border-border-subtle px-4 py-2 flex gap-4">
          <Skeleton className="h-3 w-12 rounded-md" />
          <Skeleton className="h-3 flex-1 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
          <Skeleton className="h-3 w-14 rounded-md" />
        </div>
        {Array.from({ length: ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border-subtle last:border-b-0"
          >
            <Skeleton className="h-3 w-16 rounded-md shrink-0" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Skeleton className="w-5 h-5 rounded-md shrink-0" />
              <Skeleton className="h-3 flex-1 max-w-40 rounded-md" />
            </div>
            <Skeleton className="h-3 w-12 rounded-md shrink-0" />
            <Skeleton className="h-5 w-14 rounded-md shrink-0" />
            <Skeleton className="h-3 w-14 rounded-md shrink-0" />
          </div>
        ))}
      </div>
    </>
  )
}
