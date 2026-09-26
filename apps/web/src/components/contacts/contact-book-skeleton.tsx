import { Skeleton } from "@/components/ui/skeleton";

const ROWS = 10;

export function ContactBookSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="mb-4 flex items-center px-3 pt-4">
        <Skeleton className="h-4 w-16 rounded-sm" />
      </div>

      <div className="px-2.5 pt-2 pb-1.5">
        <Skeleton className="h-7 w-full rounded-lg" />
      </div>

      <div className="px-2.5 pb-1.5">
        <Skeleton className="h-9 w-full rounded-xl" />
      </div>

      <div className="pb-3 flex flex-col gap-0.5 stagger-fade">
        {Array.from({ length: ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex h-9 items-center gap-2 px-2.5"
            style={{ opacity: 1 - i * 0.06 }}
          >
            <Skeleton
              className="h-2.5 flex-1 rounded-md"
              style={{ maxWidth: `${55 + (i % 3) * 15}%` }}
            />
            <Skeleton className="size-2 shrink-0 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
