import { Skeleton } from "@/components/ui/skeleton";

export function PackageCardSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex shrink-0 -space-x-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="size-8 rounded-full border-2 border-surface-card"
            />
          ))}
        </div>
        <Skeleton className="hidden h-4 w-20 rounded-md sm:block" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function PackageGridSkeleton({
  count = 6,
  className = "overflow-hidden rounded-xl border border-border-subtle bg-surface-card stagger-fade",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={i > 0 ? "border-t border-border-subtle" : undefined}
        >
          <PackageCardSkeleton />
        </div>
      ))}
    </div>
  );
}
