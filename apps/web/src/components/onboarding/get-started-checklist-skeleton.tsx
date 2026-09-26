import { Skeleton } from "@/components/ui/skeleton";

export function GetStartedChecklistSkeleton() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2.5 w-40" />
        </div>
        <Skeleton className="h-4 w-8 rounded-full" />
      </div>
      <div className="flex flex-col">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-3.5 py-2.5 border-b border-border-subtle last:border-b-0"
          >
            <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 pt-0.5">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2.5 w-44" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end border-t border-border px-3.5 py-2">
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  );
}
