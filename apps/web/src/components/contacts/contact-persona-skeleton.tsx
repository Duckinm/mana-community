import { Skeleton } from "@/components/ui/skeleton";

export function ContactPersonaSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-lg" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-52 max-w-full rounded-md" />
          <div className="mt-2 flex gap-1.5">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
