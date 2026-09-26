import { Skeleton } from "@/components/ui/skeleton";

export function StorageQuotaBarSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-0.5 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-16 rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-border-subtle px-3 pb-2 pt-3">
      <Skeleton className="mb-1 h-1 w-full rounded-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-14 rounded-md" />
        <Skeleton className="h-2.5 w-10 rounded-md" />
      </div>
    </div>
  );
}
