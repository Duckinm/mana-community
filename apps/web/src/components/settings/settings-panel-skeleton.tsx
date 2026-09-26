import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPanelSkeleton() {
  return (
    <div className="space-y-6 p-6 stagger-fade">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32 rounded-md" />
        <Skeleton className="h-3 w-64 rounded-md" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border-subtle p-4">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
