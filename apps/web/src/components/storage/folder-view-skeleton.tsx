import { Skeleton } from "@/components/ui/skeleton";

export function FolderViewSkeleton() {
 return (
 <div className="flex min-h-0 min-w-0 flex-1 flex-col">
 <div className="flex items-center justify-between mb-4">
 <Skeleton className="h-2.5 w-24 rounded-sm" />
 <div className="flex items-center gap-2">
 <Skeleton className="h-7 w-24 rounded-xl" />
 <Skeleton className="h-7 w-20 rounded-xl" />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2 mb-4">
 {[1, 2, 3].map((i) => (
 <Skeleton key={i} className="h-12 rounded-xl" />
 ))}
 </div>

 <div className="rounded-2xl overflow-hidden border border-border">
 <div
 className="flex items-center gap-3 px-3 py-2"
 style={{ borderBottom: "1px solid var(--border-subtle)" }}
 >
 <Skeleton className="w-4 h-4 rounded shrink-0" />
 <Skeleton className="h-2 w-16 rounded-sm" />
 </div>
 {[1, 2, 3, 4].map((i) => (
 <div
 key={i}
 className="flex items-center gap-3 px-3 py-2.5"
 style={{
 borderBottom: i < 4 ? "1px solid var(--border-subtle)" : "none",
 }}
 >
 <Skeleton className="w-4 h-4 rounded shrink-0" />
 <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
 <div className="flex-1 min-w-0 space-y-1.5">
 <Skeleton className="h-3 w-3/4 rounded-sm" />
 </div>
 <Skeleton className="h-2.5 w-12 rounded-sm shrink-0" />
 <Skeleton className="h-2.5 w-16 rounded-sm shrink-0" />
 </div>
 ))}
 </div>
 </div>
 );
}
