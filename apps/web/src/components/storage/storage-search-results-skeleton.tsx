import { Skeleton } from "@/components/ui/skeleton";

export function StorageSearchResultsSkeleton() {
  return (
    <div className="max-h-72 overflow-y-auto stagger-fade">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-3.5 w-3.5 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-3 w-3/4 rounded-md" />
            <Skeleton className="h-2.5 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
