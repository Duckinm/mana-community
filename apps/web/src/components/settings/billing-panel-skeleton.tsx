// Skeleton for BillingPanel — usage block + plan card + 4 data rows
import { Skeleton } from '@/components/ui/skeleton'
import { UsageHeatmapSkeleton } from '@/components/settings/usage-heatmap-skeleton'

export function BillingPanelSkeleton() {
 return (
 <div className="stagger-fade">
 <UsageHeatmapSkeleton className="mb-3" />

 <div
 className="rounded-xl p-4 mb-6 flex items-center justify-between"
 style={{
 background: 'var(--primary-soft)',
 border: '1px solid var(--primary-soft)',
 }}
 >
 <div className="flex flex-col gap-2">
 <Skeleton className="h-4 w-36 rounded-md" />
 <Skeleton className="h-3 w-24 rounded-sm" />
 </div>
 <Skeleton className="h-9 w-20 rounded-xl" />
 </div>

 {Array.from({ length: 4 }).map((_, i) => (
 <div
 key={i}
 className="flex items-center justify-between py-3.5 border-b border-border-subtle"
 >
 <div className="flex flex-col gap-1">
 <Skeleton className="h-3 w-24 rounded-md" />
 {i === 1 && <Skeleton className="h-2.5 w-28 rounded-sm" />}
 </div>
 <Skeleton className={`h-3.5 rounded-md ${i === 0 ? 'w-40' : 'w-20'}`} />
 </div>
 ))}
 </div>
 )
}
