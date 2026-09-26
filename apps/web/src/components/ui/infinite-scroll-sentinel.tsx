import { useEffect, useRef } from "react";

export function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  scrollRootRef,
  isLoadingMore = false,
  className = "h-6 shrink-0",
}: {
  hasMore: boolean;
  onLoadMore: () => void;
  scrollRootRef?: React.RefObject<Element | null>;
  isLoadingMore?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      {
        root: scrollRootRef?.current ?? null,
        rootMargin: "200px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore, scrollRootRef]);

  if (!hasMore && !isLoadingMore) return null;

  return <div ref={ref} className={className} aria-hidden />;
}
