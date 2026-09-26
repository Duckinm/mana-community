import { Skeleton } from "@/components/ui/skeleton";

function SectionDivider() {
  return <div className="border-t border-border-subtle" />;
}

export function GuestDocumentViewSkeleton() {
  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-card overflow-hidden">
      <div className="flex items-start justify-between gap-3 bg-surface-raised px-4 py-5 sm:gap-6 sm:px-8 sm:py-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="text-right space-y-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 ml-auto" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-12 ml-auto" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        </div>
      </div>

      <SectionDivider />

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2">
        <div className="space-y-2 px-4 py-5 sm:px-8 sm:py-6">
          <Skeleton className="h-3 w-10 mb-3" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-2 border-t border-border-subtle px-4 py-5 min-[480px]:border-l min-[480px]:border-t-0 sm:px-8 sm:py-6">
          <Skeleton className="h-3 w-10 mb-3" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>

      <SectionDivider />

      <div className="overflow-hidden px-4 py-5 sm:px-8 sm:py-6">
        <div className="mb-4 hidden grid-cols-[1fr_48px_80px_88px] gap-x-4 border-b border-border-subtle pb-2 min-[480px]:grid">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-3 gap-x-3 gap-y-2 py-3 min-[480px]:grid-cols-[1fr_48px_80px_88px] min-[480px]:gap-x-4 min-[480px]:gap-y-0 min-[480px]:py-2"
            >
              <Skeleton className="col-span-3 h-4 w-full min-[480px]:col-span-1" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-5 ml-auto w-60 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-border-subtle">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>

      <SectionDivider />

      <div className="px-4 py-5 sm:px-8 sm:py-6">
        <Skeleton className="h-3 w-24 mb-4" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-3 w-24 shrink-0" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
