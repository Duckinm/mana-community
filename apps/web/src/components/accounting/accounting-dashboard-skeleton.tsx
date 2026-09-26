import { Skeleton } from "@/components/ui/skeleton";

export function AccountingDashboardSkeleton() {
  return (
    <>
      <div className="surface-card mb-5 grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border-subtle min-[360px]:grid-cols-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-0 bg-card px-4 py-3.5">
            <Skeleton className="mb-2 h-3 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className="mb-5 hidden grid-cols-2 gap-3 md:grid xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="surface-card relative overflow-hidden rounded-xl p-4"
          >
            <Skeleton className="mb-2 h-7 w-7 rounded-lg" />
            <Skeleton className="mb-2 h-3 w-20 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}
