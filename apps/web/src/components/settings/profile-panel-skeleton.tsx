import { Skeleton } from "@/components/ui/skeleton";

export function ProfilePanelSkeleton() {
 return (
 <div className="stagger-fade">
 <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
 <Skeleton className="w-16 h-16 rounded-2xl shrink-0" />
 <div className="flex flex-col gap-2">
 <Skeleton className="h-4 w-40 rounded-md" />
 <Skeleton className="h-3 w-32 rounded-md" />
 <Skeleton className="h-3 w-24 rounded-md" />
 </div>
 </div>

 {Array.from({ length: 8 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center justify-between py-3.5 border-b border-border-subtle"
 >
 <div className="flex flex-col gap-1">
 <Skeleton className="h-3 w-20 rounded-md" />
 {i === 2 && <Skeleton className="h-2.5 w-32 rounded-sm" />}
 </div>
 <Skeleton className="h-9 w-48 rounded-xl" />
 </div>
 ))}
 </div>
 );
}
