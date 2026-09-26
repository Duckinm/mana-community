import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ContactStatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-3", className)}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="stat-card max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:!px-3 max-sm:!py-2.5"
        >
          <Skeleton className="h-3 w-16 rounded-sm max-sm:flex-1" />
          <Skeleton className="mt-2 h-7 w-20 rounded-md max-sm:mt-0 max-sm:h-4" />
          <Skeleton className="mt-2 h-2.5 w-24 rounded-sm max-sm:mt-1.5" />
        </div>
      ))}
    </div>
  );
}
