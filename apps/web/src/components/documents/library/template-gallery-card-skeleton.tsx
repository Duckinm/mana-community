import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_ASPECTS = [
  "aspect-[4/5]",
  "aspect-square",
  "aspect-[3/4]",
  "aspect-[5/4]",
] as const;

export function TemplateGalleryCardSkeleton({ index = 0 }: { index?: number }) {
  const aspect = SKELETON_ASPECTS[index % SKELETON_ASPECTS.length];
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card">
      <Skeleton className={`w-full rounded-none ${aspect}`} />
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <Skeleton className="h-3.5 w-3/4 rounded-md" />
        <Skeleton className="h-2.5 w-1/2 rounded-md" />
      </div>
    </div>
  );
}
