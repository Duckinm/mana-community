import { Skeleton } from "@/components/ui/skeleton";

export function RedirectLoadingSkeleton() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-3 w-56 rounded-md" />
      </div>
    </div>
  );
}
