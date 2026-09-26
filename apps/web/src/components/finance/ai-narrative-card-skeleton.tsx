import { Skeleton } from "@/components/ui/skeleton";

export function AiNarrativeCardSkeleton() {
  return (
    <div className="surface-card mb-6 rounded-2xl border border-border p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Skeleton className="h-3 w-24 rounded-md" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
      <Skeleton className="mb-2 h-6 w-3/4 rounded-md" />
      <Skeleton className="mb-1 h-3 w-full rounded-md" />
      <Skeleton className="mb-4 h-3 w-5/6 rounded-md" />
      <div className="space-y-1.5 pl-4">
        <Skeleton className="h-2.5 w-full rounded-md" />
        <Skeleton className="h-2.5 w-4/5 rounded-md" />
        <Skeleton className="h-2.5 w-3/5 rounded-md" />
      </div>
    </div>
  );
}
