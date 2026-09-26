import { Skeleton } from "@/components/ui/skeleton";

export function AppSidebarProjectsSkeleton() {
  return (
    <div className="space-y-1 px-2 py-1 stagger-fade">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
          <Skeleton className="h-3 flex-1 rounded-md" />
        </div>
      ))}
    </div>
  );
}
