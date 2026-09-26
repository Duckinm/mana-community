import { Skeleton } from '@/components/ui/skeleton'

const WIDTHS = ['w-16', 'w-20', 'w-14', 'w-24', 'w-16', 'w-20', 'w-14', 'w-24']

export function LabelsPanelSkeleton() {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5 max-h-56 overflow-y-auto p-0.5">
      {WIDTHS.map((w, i) => (
        <Skeleton key={i} className={`h-6 ${w} rounded-md`} />
      ))}
    </div>
  )
}
