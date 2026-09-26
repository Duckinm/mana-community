import { useCallback, useEffect, useState } from "react";

export const LIBRARY_PAGE_SIZE = 10;
const LOAD_MORE_DELAY_MS = 280;

export function useInfiniteSlice<T>(
  items: T[],
  pageSize = LIBRARY_PAGE_SIZE,
  resetKey = "",
) {
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    setPage(1);
    setIsLoadingMore(false);
  }, [resetKey, pageSize]);

  const visibleCount = page * pageSize;
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    window.setTimeout(() => {
      setPage((p) => p + 1);
      setIsLoadingMore(false);
    }, LOAD_MORE_DELAY_MS);
  }, [hasMore, isLoadingMore]);

  return { visible, hasMore, loadMore, isLoadingMore, total: items.length };
}
