import { Skeleton } from "@/components/ui/skeleton";

export function BudgetChartsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="surface-card rounded-2xl p-5">
        <Skeleton className="h-3 w-40 mb-4" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
      <div className="surface-card rounded-2xl px-5 py-4">
        <Skeleton className="h-3 w-44" />
      </div>
    </div>
  );
}
