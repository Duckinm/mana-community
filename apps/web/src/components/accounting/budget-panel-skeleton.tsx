import { Skeleton } from "@/components/ui/skeleton";

export function BudgetPanelSkeleton() {
  return (
    <div className="list-shell">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
      <div className="divide-y divide-border-subtle">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="h-3.5 w-14 ml-auto" />
                <Skeleton className="h-2.5 w-16 ml-auto" />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <Skeleton className="h-2 flex-1 rounded-full" />
              <Skeleton className="h-3 w-8 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
