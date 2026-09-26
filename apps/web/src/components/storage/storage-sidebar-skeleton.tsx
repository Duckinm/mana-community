import { Skeleton } from "@/components/ui/skeleton";

export function StorageSidebarSkeleton() {
  return (
    <div className="flex h-full w-full shrink-0 flex-col overflow-hidden lg:w-72">
      <div className="shrink-0 border-b border-border-subtle p-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <div className="px-3 py-2">
          <Skeleton className="h-2 w-14 rounded-sm" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton
              className="h-2.5 flex-1 rounded-sm"
              style={{ opacity: 1 - i * 0.15 }}
            />
          </div>
        ))}
        <div className="px-3 py-2 mt-1">
          <Skeleton className="h-2 w-14 rounded-sm" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton
              className="h-2.5 flex-1 rounded-sm"
              style={{ opacity: 1 - i * 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-border-subtle px-3 py-2.5 space-y-1">
        <Skeleton className="h-0.5 w-full rounded-full" />
        <Skeleton className="h-2 w-24 rounded-sm" />
      </div>
    </div>
  );
}
