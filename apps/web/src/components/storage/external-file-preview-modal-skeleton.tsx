import { Skeleton } from '@/components/ui/skeleton'

export function ExternalFilePreviewModalSkeleton() {
  return (
    <div aria-busy="true" className="flex min-h-[min(34rem,68vh)] w-full items-center justify-center bg-surface-raised/50 p-4 sm:p-6">
      <Skeleton className="h-[min(28rem,56vh)] w-full max-w-3xl rounded-xl" />
    </div>
  )
}
