import { Skeleton } from '@/components/ui/skeleton'

export function WorkspaceHomeSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-10 w-64 max-w-full" />
      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
        {[0, 1, 2, 3].map(key => (
          <div key={key} className="flex items-center gap-3 p-4">
            <Skeleton className="size-5 shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-4/5" /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
