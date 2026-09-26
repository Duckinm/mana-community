// Skeleton for BoardTab — 4 kanban columns with task card stubs
import { Skeleton } from '@/components/ui/skeleton'

// Vary card counts per column to feel realistic
const COLUMN_CARDS = [2, 3, 2, 1]

export function BoardTabSkeleton() {
 return (
 <div className="overflow-x-auto">
 <div className="grid grid-cols-4 gap-4 min-w-[760px]">
 {COLUMN_CARDS.map((count, col) => (
 <div key={col}>
 <div className="flex items-center justify-between mb-3 px-1">
 <div className="flex items-center gap-2">
 <Skeleton className="h-3 w-16 rounded-md" />
 <Skeleton className="h-5 w-6 rounded-md" />
 </div>
 <Skeleton className="w-4 h-4 rounded-sm" />
 </div>

 <div className="space-y-2 stagger-fade">
 {Array.from({ length: count }).map((_, i) => (
 <div
 key={i}
 className="surface-card rounded-xl p-3"
 >
 <Skeleton className="h-3.5 w-full rounded-md mb-2" />
 {i % 2 === 0 && <Skeleton className="h-3 w-4/5 rounded-md mb-3" />}
 <div className="flex items-center gap-2 mb-2.5">
 <Skeleton className="h-2.5 w-14 rounded-sm" />
 <Skeleton className="h-4 w-12 rounded-md" />
 </div>
 <div className="flex items-center justify-between">
 <Skeleton className="h-2.5 w-12 rounded-sm" />
 <Skeleton className="w-1.5 h-1.5 rounded-full" />
 </div>
 </div>
 ))}
 <Skeleton className="h-9 w-full rounded-xl" style={{ opacity: 0.4 }} />
 </div>
 </div>
 ))}
 </div>
 </div>
 )
}
