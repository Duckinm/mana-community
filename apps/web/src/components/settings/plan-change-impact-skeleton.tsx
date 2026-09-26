import { Skeleton } from "@/components/ui/skeleton";

export function PlanChangeImpactSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-border-subtle p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Skeleton className="mt-0.5 size-3.5 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-40 rounded-md" />
          <Skeleton className="h-2.5 w-full rounded-sm" />
          <Skeleton className="h-2.5 w-3/4 rounded-sm" />
        </div>
      </div>
    </div>
  );
}
