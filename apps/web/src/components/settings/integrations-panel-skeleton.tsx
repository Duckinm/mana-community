import { Skeleton } from "@/components/ui/skeleton";

const ROW_COUNT = 3;

export function IntegrationsPanelSkeleton() {
 return (
 <div className="space-y-2 stagger-fade">
 {Array.from({ length: ROW_COUNT }).map((_, i) => (
 <div
 key={i}
 className="flex items-center gap-3 rounded-xl px-4 py-3.5 border border-border"
 style={{ opacity: 1 - i * 0.08 }}
 >
 <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
 <div className="flex-1 flex flex-col gap-1.5">
 <Skeleton className="h-3.5 w-28 rounded-md" />
 <Skeleton className="h-2.5 w-36 rounded-sm" />
 </div>
 {i < 2 ? (
 <Skeleton className="h-6 w-20 rounded-full" />
 ) : (
 <Skeleton className="h-7 w-16 rounded-lg" />
 )}
 </div>
 ))}
 </div>
 );
}
