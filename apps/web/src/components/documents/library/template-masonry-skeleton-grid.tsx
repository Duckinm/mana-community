import { MasonryGrid } from "@/components/documents/library/masonry-grid";
import { TemplateGalleryCardSkeleton } from "@/components/documents/library/template-gallery-card-skeleton";

interface TemplateMasonrySkeletonGridProps {
  count?: number;
  className?: string;
  padded?: boolean;
}

export function TemplateMasonrySkeletonGrid({
  count = 8,
  className,
  padded = true,
}: TemplateMasonrySkeletonGridProps) {
  return (
    <MasonryGrid className={className ?? (padded ? "p-5" : undefined)}>
      {Array.from({ length: count }).map((_, i) => (
        <TemplateGalleryCardSkeleton key={i} index={i} />
      ))}
    </MasonryGrid>
  );
}
