import { Skeleton } from "@/components/ui/skeleton";

export function CashFlowForecastSkeleton() {
  return (
    <div className="surface-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-48 mt-4" />
    </div>
  );
}
