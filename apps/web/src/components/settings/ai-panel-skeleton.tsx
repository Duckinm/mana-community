// Skeleton for AIPanel — model badge, tone selector, 3 toggles, context box, MCP row
import { Skeleton } from '@/components/ui/skeleton'

export function AIPanelSkeleton() {
 return (
 <div className="stagger-fade">
 <div
 className="flex items-center justify-between py-3.5 border-b border-border-subtle"
 >
 <Skeleton className="h-3 w-20 rounded-md" />
 <Skeleton className="h-7 w-32 rounded-full" />
 </div>

 <div
 className="flex items-center justify-between py-3.5 border-b border-border-subtle"
 >
 <Skeleton className="h-3 w-24 rounded-md" />
 <Skeleton className="h-8 w-40 rounded-lg" />
 </div>

 {Array.from({ length: 3 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center justify-between py-3.5 border-b border-border-subtle"
 >
 <div className="flex flex-col gap-1">
 <Skeleton className="h-3 w-28 rounded-md" />
 <Skeleton className="h-2.5 w-40 rounded-sm" />
 </div>
 <Skeleton className="h-6 w-10 rounded-full" />
 </div>
 ))}

 <Skeleton className="mt-6 h-16 w-full rounded-xl" />

 <div className="mt-6 flex items-center justify-between py-3.5">
 <div className="flex flex-col gap-1">
 <Skeleton className="h-3 w-32 rounded-md" />
 <Skeleton className="h-2.5 w-56 rounded-sm" />
 </div>
 <div className="flex items-center gap-2">
 <Skeleton className="h-8 w-36 rounded-lg" />
 <Skeleton className="h-8 w-20 rounded-md" />
 </div>
 </div>
 </div>
 )
}
