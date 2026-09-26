import { Skeleton } from "@/components/ui/skeleton";

export function ChatSearchResultsSkeleton() {
  return (
    <div className="divide-y divide-border-subtle stagger-fade">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-2.5 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
