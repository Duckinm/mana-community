import { Skeleton } from "@/components/ui/skeleton";

export function DocumentWizardSkeleton() {
  return (
    <div className="flex h-full w-full">
      <div className="w-full min-w-0 space-y-4 p-4 md:p-8 lg:w-[40%] lg:border-r lg:border-dashed lg:border-border-strong">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-2/3 rounded-lg" />
      </div>
      <div className="hidden flex-1 p-8 lg:block">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
