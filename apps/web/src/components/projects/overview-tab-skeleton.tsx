import { Skeleton } from "@/components/ui/skeleton";

export function OverviewTabSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md shrink-0" />
      </div>

      <div className="surface-card rounded-xl p-3 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-md" />
        ))}
      </div>

      <div className="surface-card rounded-2xl min-h-64">
        <Skeleton className="h-10 w-full rounded-t-2xl rounded-b-none" />
        <div className="p-5 space-y-2">
          <Skeleton className="h-3.5 w-3/4 rounded-md" />
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
        </div>
      </div>
    </div>
  );
}
