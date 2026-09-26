import { Skeleton } from "@/components/ui/skeleton";

export function UsageHeatmapSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="surface-card rounded-xl p-4 mb-3">
        <Skeleton className="h-4 w-28 rounded-md mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="[&:not(:first-of-type)]:mt-3">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <Skeleton className="h-3 w-24 rounded-sm" />
              <Skeleton className="h-3 w-16 rounded-sm" />
            </div>
            {(i === 1 || i === 2) && (
              <Skeleton className="h-2 w-full rounded-full" />
            )}
          </div>
        ))}
        <Skeleton className="h-3 w-40 rounded-sm mt-3" />
      </div>

      <div className="surface-card rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-7 w-52 rounded-lg" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-3 w-32 rounded-sm mt-3" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-2.5 w-16 rounded-sm mb-1" />
              <Skeleton className="h-3 w-10 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
