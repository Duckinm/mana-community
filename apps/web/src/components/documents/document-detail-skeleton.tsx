import { Skeleton } from "@/components/ui/skeleton";

export function DocumentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32 rounded-md" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-40 rounded-md" />
          <Skeleton className="h-4 w-52 rounded-md" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="mb-2 h-3 w-16 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden stagger-fade">
        <div className="border-b border-border-subtle px-4 py-2">
          <Skeleton className="h-3 w-full max-w-md rounded-md" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-b border-border-subtle px-4 py-3 last:border-0">
            <Skeleton className="h-3.5 w-full rounded-md" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-4 space-y-2">
        <Skeleton className="h-3 w-20 rounded-md" />
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
      </div>
    </div>
  );
}
