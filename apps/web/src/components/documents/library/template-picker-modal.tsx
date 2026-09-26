import { MasonryGrid } from "@/components/documents/library/masonry-grid";
import { TemplateGalleryCard } from "@/components/documents/library/template-gallery-card";
import { TemplateGalleryCardSkeleton } from "@/components/documents/library/template-gallery-card-skeleton";
import { TemplateMasonrySkeletonGrid } from "@/components/documents/library/template-masonry-skeleton-grid";
import { Search } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  LIBRARY_PAGE_SIZE,
  useInfiniteSlice,
} from "@/hooks/use-infinite-slice";
import type { ItemTemplate } from "@/hooks/use-item-templates";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: ItemTemplate[];
  onPick: (templateId: string) => void;
  isLoading?: boolean;
}

export function TemplatePickerModal({
  open,
  onOpenChange,
  templates,
  onPick,
  isLoading = false,
}: TemplatePickerModalProps) {
  const { t } = useTranslation("documents");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [templates, query]);

  const { visible, hasMore, loadMore, isLoadingMore } = useInfiniteSlice(
    filtered,
    LIBRARY_PAGE_SIZE,
    `${open}-${query}`,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border-subtle px-5 pb-3 pt-5">
          <DialogTitle>{t("templatePickerModal.title")}</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 px-5 py-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("templatePickerModal.searchPlaceholder")}
              className="w-full rounded-lg border border-border-subtle bg-surface-raised py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-warning"
            />
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"
        >
          {isLoading ? (
            <TemplateMasonrySkeletonGrid count={12} padded={false} />
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query.trim()
                ? t("templatePickerModal.noTemplatesMatch", { query })
                : t("templatePickerModal.noTemplatesAvailable")}
            </p>
          ) : (
            <>
              <MasonryGrid>
                {visible.map((t) => (
                  <TemplateGalleryCard
                    key={t.id}
                    template={t}
                    currency={t.currency}
                    pickMode
                    onClick={() => onPick(t.id)}
                  />
                ))}
                {isLoadingMore &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TemplateGalleryCardSkeleton key={`more-${i}`} index={i} />
                  ))}
              </MasonryGrid>
              <InfiniteScrollSentinel
                hasMore={hasMore}
                onLoadMore={loadMore}
                scrollRootRef={scrollRef}
                isLoadingMore={isLoadingMore}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
