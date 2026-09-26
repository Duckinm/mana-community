import { Skeleton } from "@/components/ui/skeleton";

const TABLE_GRID =
  "grid min-w-[42rem] grid-cols-[minmax(18rem,1fr)_repeat(3,7.5rem)]";

export function RemarkTemplatesPanelSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2.5 stagger-fade md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-subtle bg-card p-3.5 sm:p-4"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="size-9 rounded-lg" />
              </div>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-3">
              <Skeleton className="mb-2 h-3 w-16" />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-[4.5rem] rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-card md:block">
        <div
          className={`${TABLE_GRID} border-b border-border-subtle bg-surface-raised/50`}
        >
          <div className="px-5 py-3">
            <Skeleton className="h-3 w-16" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex justify-center border-l border-border-subtle px-3 py-3"
            >
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`${TABLE_GRID} border-b border-border-subtle last:border-b-0`}
          >
            <div className="space-y-2 px-5 py-4">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-4/5" />
            </div>
            {Array.from({ length: 3 }).map((_, typeIndex) => (
              <div
                key={typeIndex}
                className="flex items-center justify-center border-l border-border-subtle px-3 py-4"
              >
                <Skeleton className="size-7 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
