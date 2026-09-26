import { Skeleton } from "@/components/ui/skeleton";

export function PromotionWizardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-5 w-20 rounded-md" />
      <Skeleton className="h-6 w-36 rounded" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <div className="space-y-2 rounded-xl border border-border-subtle p-3.5 stagger-fade">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
