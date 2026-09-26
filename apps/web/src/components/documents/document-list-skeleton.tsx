import { Skeleton } from '@/components/ui/skeleton'
import type { DocumentsView } from '@/components/documents/document-view-switcher'

export function DocumentListSkeleton({ view }: { view: DocumentsView }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>
      <div className="list-shell stagger-fade">
        {view === 'chronological' && (
          <div className="flex items-center gap-3 border-b border-border-subtle px-3 py-2.5">
            <Skeleton className="size-3.5 rounded-full" />
            <Skeleton className="h-3 flex-1 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        )}
        {view === 'chronological'
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-28 max-w-full rounded-md" />
                  <Skeleton className="h-3 w-36 max-w-full rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-20 rounded-md" />
              </div>
            ))
          : (['QO', 'INV', 'RC'] as const).map((type, groupIndex) => (
              <div key={type} className={groupIndex > 0 ? 'border-t border-border-subtle' : undefined}>
                <div className="flex items-center gap-2 bg-surface-raised/40 px-3 py-2">
                  <Skeleton className="size-3.5 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                  <Skeleton className="h-3 w-4 rounded-md" />
                </div>
                {Array.from({ length: groupIndex === 0 ? 3 : 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5"
                    style={{
                      borderBottom: i < (groupIndex === 0 ? 2 : 1) ? '1px solid var(--border-subtle)' : undefined,
                    }}
                  >
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <Skeleton className="h-3.5 w-28 max-w-full rounded-md" />
                      <Skeleton className="h-3 w-36 max-w-full rounded-md" />
                    </div>
                    <Skeleton className="h-3.5 w-16 shrink-0 rounded-md sm:hidden" />
                    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <Skeleton className="h-5 w-16 rounded-md" />
                      <Skeleton className="h-3.5 w-14 rounded-md" />
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
                      <Skeleton className="h-3 w-20 rounded-md" />
                      <Skeleton className="h-3 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
      </div>
    </div>
  )
}
