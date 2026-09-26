import { Skeleton } from "@/components/ui/skeleton";

export function AccountingChartsSkeleton() {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="surface-card rounded-xl p-4">
        <Skeleton className="mb-3 h-3 w-36" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="surface-card rounded-xl p-4">
        <Skeleton className="mb-3 h-3 w-40" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>
    </div>
  );
}
