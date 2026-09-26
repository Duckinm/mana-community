import { Skeleton } from "@/components/ui/skeleton";

export function TemplateRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-3 w-56 rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Skeleton className="h-4 w-16 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  );
}

export function TemplateGridSkeleton({
  count = 8,
  className = "my-5 list-shell stagger-fade max-xl:mx-0 xl:mx-4 @xl:mx-6 @4xl:mx-10",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={i > 0 ? "border-t border-border-subtle" : undefined}
        >
          <TemplateRowSkeleton />
        </div>
      ))}
    </div>
  );
}
